// weapp.qrcode.js v0.5.0 (https://github.com/yingye/weapp-qrcode#readme)
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.umd = factory());
}(this, (function () { 'use strict';

//---------------------------------------------------------------------
// QRCode for JavaScript
//
// Copyright (c) 2009 Kazuhiko Arase
//
// URL: http://www.d-project.com/
//
// Licensed under the MIT license:
//   http://www.opensource.org/licenses/mit-license.php
//
// The word "QR Code" is registered trademark of 
// DENSO WAVE INCORPORATED
//   http://www.denso-wave.com/qrcode/faqpatent-e.html
//
//---------------------------------------------------------------------

//---------------------------------------------------------------------
// QR8bitByte
//---------------------------------------------------------------------

function QR8bitByte(data) {
  this.mode = QRMode.MODE_8BIT_BYTE;
  this.data = data;
}

QR8bitByte.prototype = {

  getLength: function (buffer) {
    return this.data.length;
  },

  write: function (buffer) {
    for (var i = 0; i < this.data.length; i++) {
      // not JIS ...
      buffer.put(this.data.charCodeAt(i), 8);
    }
  }
};

//---------------------------------------------------------------------
// QRCode
//---------------------------------------------------------------------

function QRCode(typeNumber, errorCorrectLevel) {
  this.typeNumber = typeNumber;
  this.errorCorrectLevel = errorCorrectLevel;
  this.modules = null;
  this.moduleCount = 0;
  this.dataCache = null;
  this.dataList = new Array();
}

QRCode.prototype = {

  addData: function (data) {
    var newData = new QR8bitByte(data);
    this.dataList.push(newData);
    this.dataCache = null;
  },

  isDark: function (row, col) {
    if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
      throw new Error(row + "," + col);
    }
    return this.modules[row][col];
  },

  getModuleCount: function () {
    return this.moduleCount;
  },

  make: function () {
    // Calculate automatically typeNumber if provided is < 1
    if (this.typeNumber < 1) {
      var typeNumber = 1;
      for (typeNumber = 1; typeNumber < 40; typeNumber++) {
        var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);

        var buffer = new QRBitBuffer();
        var totalDataCount = 0;
        for (var i = 0; i < rsBlocks.length; i++) {
          totalDataCount += rsBlocks[i].dataCount;
        }

        for (var i = 0; i < this.dataList.length; i++) {
          var data = this.dataList[i];
          buffer.put(data.mode, 4);
          buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
          data.write(buffer);
        }
        if (buffer.getLengthInBits() <= totalDataCount * 8) break;
      }
      this.typeNumber = typeNumber;
    }
    this.makeImpl(false, this.getBestMaskPattern());
  },

  makeImpl: function (test, maskPattern) {

    this.moduleCount = this.typeNumber * 4 + 17;
    this.modules = new Array(this.moduleCount);

    for (var row = 0; row < this.moduleCount; row++) {

      this.modules[row] = new Array(this.moduleCount);

      for (var col = 0; col < this.moduleCount; col++) {
        this.modules[row][col] = null; //(col + row) % 3;
      }
    }

    this.setupPositionProbePattern(0, 0);
    this.setupPositionProbePattern(this.moduleCount - 7, 0);
    this.setupPositionProbePattern(0, this.moduleCount - 7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(test, maskPattern);

    if (this.typeNumber >= 7) {
      this.setupTypeNumber(test);
    }

    if (this.dataCache == null) {
      this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
    }

    this.mapData(this.dataCache, maskPattern);
  },

  setupPositionProbePattern: function (row, col) {

    for (var r = -1; r <= 7; r++) {

      if (row + r <= -1 || this.moduleCount <= row + r) continue;

      for (var c = -1; c <= 7; c++) {

        if (col + c <= -1 || this.moduleCount <= col + c) continue;

        if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) {
          this.modules[row + r][col + c] = true;
        } else {
          this.modules[row + r][col + c] = false;
        }
      }
    }
  },

  getBestMaskPattern: function () {

    var minLostPoint = 0;
    var pattern = 0;

    for (var i = 0; i < 8; i++) {

      this.makeImpl(true, i);

      var lostPoint = QRUtil.getLostPoint(this);

      if (i == 0 || minLostPoint > lostPoint) {
        minLostPoint = lostPoint;
        pattern = i;
      }
    }

    return pattern;
  },

  createMovieClip: function (target_mc, instance_name, depth) {

    var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
    var cs = 1;

    this.make();

    for (var row = 0; row < this.modules.length; row++) {

      var y = row * cs;

      for (var col = 0; col < this.modules[row].length; col++) {

        var x = col * cs;
        var dark = this.modules[row][col];

        if (dark) {
          qr_mc.beginFill(0, 100);
          qr_mc.moveTo(x, y);
          qr_mc.lineTo(x + cs, y);
          qr_mc.lineTo(x + cs, y + cs);
          qr_mc.lineTo(x, y + cs);
          qr_mc.endFill();
        }
      }
    }

    return qr_mc;
  },

  setupTimingPattern: function () {

    for (var r = 8; r < this.moduleCount - 8; r++) {
      if (this.modules[r][6] != null) {
        continue;
      }
      this.modules[r][6] = r % 2 == 0;
    }

    for (var c = 8; c < this.moduleCount - 8; c++) {
      if (this.modules[6][c] != null) {
        continue;
      }
      this.modules[6][c] = c % 2 == 0;
    }
  },

  setupPositionAdjustPattern: function () {

    var pos = QRUtil.getPatternPosition(this.typeNumber);

    for (var i = 0; i < pos.length; i++) {

      for (var j = 0; j < pos.length; j++) {

        var row = pos[i];
        var col = pos[j];

        if (this.modules[row][col] != null) {
          continue;
        }

        for (var r = -2; r <= 2; r++) {

          for (var c = -2; c <= 2; c++) {

            if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) {
              this.modules[row + r][col + c] = true;
            } else {
              this.modules[row + r][col + c] = false;
            }
          }
        }
      }
    }
  },

  setupTypeNumber: function (test) {

    var bits = QRUtil.getBCHTypeNumber(this.typeNumber);

    for (var i = 0; i < 18; i++) {
      var mod = !test && (bits >> i & 1) == 1;
      this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
    }

    for (var i = 0; i < 18; i++) {
      var mod = !test && (bits >> i & 1) == 1;
      this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  },

  setupTypeInfo: function (test, maskPattern) {

    var data = this.errorCorrectLevel << 3 | maskPattern;
    var bits = QRUtil.getBCHTypeInfo(data);

    // vertical   
    for (var i = 0; i < 15; i++) {

      var mod = !test && (bits >> i & 1) == 1;

      if (i < 6) {
        this.modules[i][8] = mod;
      } else if (i < 8) {
        this.modules[i + 1][8] = mod;
      } else {
        this.modules[this.moduleCount - 15 + i][8] = mod;
      }
    }

    // horizontal
    for (var i = 0; i < 15; i++) {

      var mod = !test && (bits >> i & 1) == 1;

      if (i < 8) {
        this.modules[8][this.moduleCount - i - 1] = mod;
      } else if (i < 9) {
        this.modules[8][15 - i - 1 + 1] = mod;
      } else {
        this.modules[8][15 - i - 1] = mod;
      }
    }

    // fixed module
    this.modules[this.moduleCount - 8][8] = !test;
  },

  mapData: function (data, maskPattern) {

    var inc = -1;
    var row = this.moduleCount - 1;
    var bitIndex = 7;
    var byteIndex = 0;

    for (var col = this.moduleCount - 1; col > 0; col -= 2) {

      if (col == 6) col--;

      while (true) {

        for (var c = 0; c < 2; c++) {

          if (this.modules[row][col - c] == null) {

            var dark = false;

            if (byteIndex < data.length) {
              dark = (data[byteIndex] >>> bitIndex & 1) == 1;
            }

            var mask = QRUtil.getMask(maskPattern, row, col - c);

            if (mask) {
              dark = !dark;
            }

            this.modules[row][col - c] = dark;
            bitIndex--;

            if (bitIndex == -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        }

        row += inc;

        if (row < 0 || this.moduleCount <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }

};

QRCode.PAD0 = 0xEC;
QRCode.PAD1 = 0x11;

QRCode.createData = function (typeNumber, errorCorrectLevel, dataList) {

  var rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);

  var buffer = new QRBitBuffer();

  for (var i = 0; i < dataList.length; i++) {
    var data = dataList[i];
    buffer.put(data.mode, 4);
    buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
    data.write(buffer);
  }

  // calc num max data.
  var totalDataCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) {
    totalDataCount += rsBlocks[i].dataCount;
  }

  if (buffer.getLengthInBits() > totalDataCount * 8) {
    throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
  }

  // end code
  if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
    buffer.put(0, 4);
  }

  // padding
  while (buffer.getLengthInBits() % 8 != 0) {
    buffer.putBit(false);
  }

  // padding
  while (true) {

    if (buffer.getLengthInBits() >= totalDataCount * 8) {
      break;
    }
    buffer.put(QRCode.PAD0, 8);

    if (buffer.getLengthInBits() >= totalDataCount * 8) {
      break;
    }
    buffer.put(QRCode.PAD1, 8);
  }

  return QRCode.createBytes(buffer, rsBlocks);
};

QRCode.createBytes = function (buffer, rsBlocks) {

  var offset = 0;

  var maxDcCount = 0;
  var maxEcCount = 0;

  var dcdata = new Array(rsBlocks.length);
  var ecdata = new Array(rsBlocks.length);

  for (var r = 0; r < rsBlocks.length; r++) {

    var dcCount = rsBlocks[r].dataCount;
    var ecCount = rsBlocks[r].totalCount - dcCount;

    maxDcCount = Math.max(maxDcCount, dcCount);
    maxEcCount = Math.max(maxEcCount, ecCount);

    dcdata[r] = new Array(dcCount);

    for (var i = 0; i < dcdata[r].length; i++) {
      dcdata[r][i] = 0xff & buffer.buffer[i + offset];
    }
    offset += dcCount;

    var rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
    var rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);

    var modPoly = rawPoly.mod(rsPoly);
    ecdata[r] = new Array(rsPoly.getLength() - 1);
    for (var i = 0; i < ecdata[r].length; i++) {
      var modIndex = i + modPoly.getLength() - ecdata[r].length;
      ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
    }
  }

  var totalCodeCount = 0;
  for (var i = 0; i < rsBlocks.length; i++) {
    totalCodeCount += rsBlocks[i].totalCount;
  }

  var data = new Array(totalCodeCount);
  var index = 0;

  for (var i = 0; i < maxDcCount; i++) {
    for (var r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r].length) {
        data[index++] = dcdata[r][i];
      }
    }
  }

  for (var i = 0; i < maxEcCount; i++) {
    for (var r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r].length) {
        data[index++] = ecdata[r][i];
      }
    }
  }

  return data;
};

//---------------------------------------------------------------------
// QRMode
//---------------------------------------------------------------------

var QRMode = {
  MODE_NUMBER: 1 << 0,
  MODE_ALPHA_NUM: 1 << 1,
  MODE_8BIT_BYTE: 1 << 2,
  MODE_KANJI: 1 << 3
};

//---------------------------------------------------------------------
// QRErrorCorrectLevel
//---------------------------------------------------------------------

var QRErrorCorrectLevel = {
  L: 1,
  M: 0,
  Q: 3,
  H: 2
};

//---------------------------------------------------------------------
// QRMaskPattern
//---------------------------------------------------------------------

var QRMaskPattern = {
  PATTERN000: 0,
  PATTERN001: 1,
  PATTERN010: 2,
  PATTERN011: 3,
  PATTERN100: 4,
  PATTERN101: 5,
  PATTERN110: 6,
  PATTERN111: 7
};

//---------------------------------------------------------------------
// QRUtil
//---------------------------------------------------------------------

var QRUtil = {

  PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170]],

  G15: 1 << 10 | 1 << 8 | 1 << 5 | 1 << 4 | 1 << 2 | 1 << 1 | 1 << 0,
  G18: 1 << 12 | 1 << 11 | 1 << 10 | 1 << 9 | 1 << 8 | 1 << 5 | 1 << 2 | 1 << 0,
  G15_MASK: 1 << 14 | 1 << 12 | 1 << 10 | 1 << 4 | 1 << 1,

  getBCHTypeInfo: function (data) {
    var d = data << 10;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) {
      d ^= QRUtil.G15 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15);
    }
    return (data << 10 | d) ^ QRUtil.G15_MASK;
  },

  getBCHTypeNumber: function (data) {
    var d = data << 12;
    while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) {
      d ^= QRUtil.G18 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18);
    }
    return data << 12 | d;
  },

  getBCHDigit: function (data) {

    var digit = 0;

    while (data != 0) {
      digit++;
      data >>>= 1;
    }

    return digit;
  },

  getPatternPosition: function (typeNumber) {
    return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
  },

  getMask: function (maskPattern, i, j) {

    switch (maskPattern) {

      case QRMaskPattern.PATTERN000:
        return (i + j) % 2 == 0;
      case QRMaskPattern.PATTERN001:
        return i % 2 == 0;
      case QRMaskPattern.PATTERN010:
        return j % 3 == 0;
      case QRMaskPattern.PATTERN011:
        return (i + j) % 3 == 0;
      case QRMaskPattern.PATTERN100:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
      case QRMaskPattern.PATTERN101:
        return i * j % 2 + i * j % 3 == 0;
      case QRMaskPattern.PATTERN110:
        return (i * j % 2 + i * j % 3) % 2 == 0;
      case QRMaskPattern.PATTERN111:
        return (i * j % 3 + (i + j) % 2) % 2 == 0;

      default:
        throw new Error("bad maskPattern:" + maskPattern);
    }
  },

  getErrorCorrectPolynomial: function (errorCorrectLength) {

    var a = new QRPolynomial([1], 0);

    for (var i = 0; i < errorCorrectLength; i++) {
      a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
    }

    return a;
  },

  getLengthInBits: function (mode, type) {

    if (1 <= type && type < 10) {

      // 1 - 9

      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 10;
        case QRMode.MODE_ALPHA_NUM:
          return 9;
        case QRMode.MODE_8BIT_BYTE:
          return 8;
        case QRMode.MODE_KANJI:
          return 8;
        default:
          throw new Error("mode:" + mode);
      }
    } else if (type < 27) {

      // 10 - 26

      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 12;
        case QRMode.MODE_ALPHA_NUM:
          return 11;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 10;
        default:
          throw new Error("mode:" + mode);
      }
    } else if (type < 41) {

      // 27 - 40

      switch (mode) {
        case QRMode.MODE_NUMBER:
          return 14;
        case QRMode.MODE_ALPHA_NUM:
          return 13;
        case QRMode.MODE_8BIT_BYTE:
          return 16;
        case QRMode.MODE_KANJI:
          return 12;
        default:
          throw new Error("mode:" + mode);
      }
    } else {
      throw new Error("type:" + type);
    }
  },

  getLostPoint: function (qrCode) {

    var moduleCount = qrCode.getModuleCount();

    var lostPoint = 0;

    // LEVEL1

    for (var row = 0; row < moduleCount; row++) {

      for (var col = 0; col < moduleCount; col++) {

        var sameCount = 0;
        var dark = qrCode.isDark(row, col);

        for (var r = -1; r <= 1; r++) {

          if (row + r < 0 || moduleCount <= row + r) {
            continue;
          }

          for (var c = -1; c <= 1; c++) {

            if (col + c < 0 || moduleCount <= col + c) {
              continue;
            }

            if (r == 0 && c == 0) {
              continue;
            }

            if (dark == qrCode.isDark(row + r, col + c)) {
              sameCount++;
            }
          }
        }

        if (sameCount > 5) {
          lostPoint += 3 + sameCount - 5;
        }
      }
    }

    // LEVEL2

    for (var row = 0; row < moduleCount - 1; row++) {
      for (var col = 0; col < moduleCount - 1; col++) {
        var count = 0;
        if (qrCode.isDark(row, col)) count++;
        if (qrCode.isDark(row + 1, col)) count++;
        if (qrCode.isDark(row, col + 1)) count++;
        if (qrCode.isDark(row + 1, col + 1)) count++;
        if (count == 0 || count == 4) {
          lostPoint += 3;
        }
      }
    }

    // LEVEL3

    for (var row = 0; row < moduleCount; row++) {
      for (var col = 0; col < moduleCount - 6; col++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) {
          lostPoint += 40;
        }
      }
    }

    for (var col = 0; col < moduleCount; col++) {
      for (var row = 0; row < moduleCount - 6; row++) {
        if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) {
          lostPoint += 40;
        }
      }
    }

    // LEVEL4

    var darkCount = 0;

    for (var col = 0; col < moduleCount; col++) {
      for (var row = 0; row < moduleCount; row++) {
        if (qrCode.isDark(row, col)) {
          darkCount++;
        }
      }
    }

    var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
    lostPoint += ratio * 10;

    return lostPoint;
  }

};

//---------------------------------------------------------------------
// QRMath
//---------------------------------------------------------------------

var QRMath = {

  glog: function (n) {

    if (n < 1) {
      throw new Error("glog(" + n + ")");
    }

    return QRMath.LOG_TABLE[n];
  },

  gexp: function (n) {

    while (n < 0) {
      n += 255;
    }

    while (n >= 256) {
      n -= 255;
    }

    return QRMath.EXP_TABLE[n];
  },

  EXP_TABLE: new Array(256),

  LOG_TABLE: new Array(256)

};

for (var i = 0; i < 8; i++) {
  QRMath.EXP_TABLE[i] = 1 << i;
}
for (var i = 8; i < 256; i++) {
  QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
}
for (var i = 0; i < 255; i++) {
  QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
}

//---------------------------------------------------------------------
// QRPolynomial
//---------------------------------------------------------------------

function QRPolynomial(num, shift) {

  if (num.length == undefined) {
    throw new Error(num.length + "/" + shift);
  }

  var offset = 0;

  while (offset < num.length && num[offset] == 0) {
    offset++;
  }

  this.num = new Array(num.length - offset + shift);
  for (var i = 0; i < num.length - offset; i++) {
    this.num[i] = num[i + offset];
  }
}

QRPolynomial.prototype = {

  get: function (index) {
    return this.num[index];
  },

  getLength: function () {
    return this.num.length;
  },

  multiply: function (e) {

    var num = new Array(this.getLength() + e.getLength() - 1);

    for (var i = 0; i < this.getLength(); i++) {
      for (var j = 0; j < e.getLength(); j++) {
        num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
    }

    return new QRPolynomial(num, 0);
  },

  mod: function (e) {

    if (this.getLength() - e.getLength() < 0) {
      return this;
    }

    var ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));

    var num = new Array(this.getLength());

    for (var i = 0; i < this.getLength(); i++) {
      num[i] = this.get(i);
    }

    for (var i = 0; i < e.getLength(); i++) {
      num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
    }

    // recursive call
    return new QRPolynomial(num, 0).mod(e);
  }
};

//---------------------------------------------------------------------
// QRRSBlock
//---------------------------------------------------------------------

function QRRSBlock(totalCount, dataCount) {
  this.totalCount = totalCount;
  this.dataCount = dataCount;
}

QRRSBlock.RS_BLOCK_TABLE = [

// L
// M
// Q
// H

// 1
[1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],

// 2
[1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],

// 3
[1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],

// 4    
[1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],

// 5
[1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],

// 6
[2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],

// 7    
[2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],

// 8
[2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],

// 9
[2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],

// 10   
[2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16],

// 11
[4, 101, 81], [1, 80, 50, 4, 81, 51], [4, 50, 22, 4, 51, 23], [3, 36, 12, 8, 37, 13],

// 12
[2, 116, 92, 2, 117, 93], [6, 58, 36, 2, 59, 37], [4, 46, 20, 6, 47, 21], [7, 42, 14, 4, 43, 15],

// 13
[4, 133, 107], [8, 59, 37, 1, 60, 38], [8, 44, 20, 4, 45, 21], [12, 33, 11, 4, 34, 12],

// 14
[3, 145, 115, 1, 146, 116], [4, 64, 40, 5, 65, 41], [11, 36, 16, 5, 37, 17], [11, 36, 12, 5, 37, 13],

// 15
[5, 109, 87, 1, 110, 88], [5, 65, 41, 5, 66, 42], [5, 54, 24, 7, 55, 25], [11, 36, 12],

// 16
[5, 122, 98, 1, 123, 99], [7, 73, 45, 3, 74, 46], [15, 43, 19, 2, 44, 20], [3, 45, 15, 13, 46, 16],

// 17
[1, 135, 107, 5, 136, 108], [10, 74, 46, 1, 75, 47], [1, 50, 22, 15, 51, 23], [2, 42, 14, 17, 43, 15],

// 18
[5, 150, 120, 1, 151, 121], [9, 69, 43, 4, 70, 44], [17, 50, 22, 1, 51, 23], [2, 42, 14, 19, 43, 15],

// 19
[3, 141, 113, 4, 142, 114], [3, 70, 44, 11, 71, 45], [17, 47, 21, 4, 48, 22], [9, 39, 13, 16, 40, 14],

// 20
[3, 135, 107, 5, 136, 108], [3, 67, 41, 13, 68, 42], [15, 54, 24, 5, 55, 25], [15, 43, 15, 10, 44, 16],

// 21
[4, 144, 116, 4, 145, 117], [17, 68, 42], [17, 50, 22, 6, 51, 23], [19, 46, 16, 6, 47, 17],

// 22
[2, 139, 111, 7, 140, 112], [17, 74, 46], [7, 54, 24, 16, 55, 25], [34, 37, 13],

// 23
[4, 151, 121, 5, 152, 122], [4, 75, 47, 14, 76, 48], [11, 54, 24, 14, 55, 25], [16, 45, 15, 14, 46, 16],

// 24
[6, 147, 117, 4, 148, 118], [6, 73, 45, 14, 74, 46], [11, 54, 24, 16, 55, 25], [30, 46, 16, 2, 47, 17],

// 25
[8, 132, 106, 4, 133, 107], [8, 75, 47, 13, 76, 48], [7, 54, 24, 22, 55, 25], [22, 45, 15, 13, 46, 16],

// 26
[10, 142, 114, 2, 143, 115], [19, 74, 46, 4, 75, 47], [28, 50, 22, 6, 51, 23], [33, 46, 16, 4, 47, 17],

// 27
[8, 152, 122, 4, 153, 123], [22, 73, 45, 3, 74, 46], [8, 53, 23, 26, 54, 24], [12, 45, 15, 28, 46, 16],

// 28
[3, 147, 117, 10, 148, 118], [3, 73, 45, 23, 74, 46], [4, 54, 24, 31, 55, 25], [11, 45, 15, 31, 46, 16],

// 29
[7, 146, 116, 7, 147, 117], [21, 73, 45, 7, 74, 46], [1, 53, 23, 37, 54, 24], [19, 45, 15, 26, 46, 16],

// 30
[5, 145, 115, 10, 146, 116], [19, 75, 47, 10, 76, 48], [15, 54, 24, 25, 55, 25], [23, 45, 15, 25, 46, 16],

// 31
[13, 145, 115, 3, 146, 116], [2, 74, 46, 29, 75, 47], [42, 54, 24, 1, 55, 25], [23, 45, 15, 28, 46, 16],

// 32
[17, 145, 115], [10, 74, 46, 23, 75, 47], [10, 54, 24, 35, 55, 25], [19, 45, 15, 35, 46, 16],

// 33
[17, 145, 115, 1, 146, 116], [14, 74, 46, 21, 75, 47], [29, 54, 24, 19, 55, 25], [11, 45, 15, 46, 46, 16],

// 34
[13, 145, 115, 6, 146, 116], [14, 74, 46, 23, 75, 47], [44, 54, 24, 7, 55, 25], [59, 46, 16, 1, 47, 17],

// 35
[12, 151, 121, 7, 152, 122], [12, 75, 47, 26, 76, 48], [39, 54, 24, 14, 55, 25], [22, 45, 15, 41, 46, 16],

// 36
[6, 151, 121, 14, 152, 122], [6, 75, 47, 34, 76, 48], [46, 54, 24, 10, 55, 25], [2, 45, 15, 64, 46, 16],

// 37
[17, 152, 122, 4, 153, 123], [29, 74, 46, 14, 75, 47], [49, 54, 24, 10, 55, 25], [24, 45, 15, 46, 46, 16],

// 38
[4, 152, 122, 18, 153, 123], [13, 74, 46, 32, 75, 47], [48, 54, 24, 14, 55, 25], [42, 45, 15, 32, 46, 16],

// 39
[20, 147, 117, 4, 148, 118], [40, 75, 47, 7, 76, 48], [43, 54, 24, 22, 55, 25], [10, 45, 15, 67, 46, 16],

// 40
[19, 148, 118, 6, 149, 119], [18, 75, 47, 31, 76, 48], [34, 54, 24, 34, 55, 25], [20, 45, 15, 61, 46, 16]];

QRRSBlock.getRSBlocks = function (typeNumber, errorCorrectLevel) {

  var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);

  if (rsBlock == undefined) {
    throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
  }

  var length = rsBlock.length / 3;

  var list = new Array();

  for (var i = 0; i < length; i++) {

    var count = rsBlock[i * 3 + 0];
    var totalCount = rsBlock[i * 3 + 1];
    var dataCount = rsBlock[i * 3 + 2];

    for (var j = 0; j < count; j++) {
      list.push(new QRRSBlock(totalCount, dataCount));
    }
  }

  return list;
};

QRRSBlock.getRsBlockTable = function (typeNumber, errorCorrectLevel) {

  switch (errorCorrectLevel) {
    case QRErrorCorrectLevel.L:
      return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
    case QRErrorCorrectLevel.M:
      return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
    case QRErrorCorrectLevel.Q:
      return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
    case QRErrorCorrectLevel.H:
      return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
    default:
      return undefined;
  }
};

//---------------------------------------------------------------------
// QRBitBuffer
//---------------------------------------------------------------------

function QRBitBuffer() {
  this.buffer = new Array();
  this.length = 0;
}

QRBitBuffer.prototype = {

  get: function (index) {
    var bufIndex = Math.floor(index / 8);
    return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
  },

  put: function (num, length) {
    for (var i = 0; i < length; i++) {
      this.putBit((num >>> length - i - 1 & 1) == 1);
    }
  },

  getLengthInBits: function () {
    return this.length;
  },

  putBit: function (bit) {

    var bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }

    if (bit) {
      this.buffer[bufIndex] |= 0x80 >>> this.length % 8;
    }

    this.length++;
  }
};

function drawQrcode(options) {
  options = options || {};
  options = Object.assign({
    width: 256,
    height: 256,
    typeNumber: -1,
    correctLevel: QRErrorCorrectLevel.H,
    background: '#ffffff',
    foreground: '#000000'
  }, options);

  if (!options.canvasId) {
    console.warn('please you set canvasId!');
    return;
  }

  createCanvas();

  function createCanvas() {
    // create the qrcode itself
    var qrcode = new QRCode(options.typeNumber, options.correctLevel);
    qrcode.addData(options.text);
    qrcode.make();

    // get canvas context
    var ctx = wx.createCanvasContext && wx.createCanvasContext(options.canvasId);

    console.log('ctx', ctx);

    // compute tileW/tileH based on options.width/options.height
    var tileW = options.width / qrcode.getModuleCount();
    var tileH = options.height / qrcode.getModuleCount();

    // draw in the canvas
    for (var row = 0; row < qrcode.getModuleCount(); row++) {
      for (var col = 0; col < qrcode.getModuleCount(); col++) {
        var style = qrcode.isDark(row, col) ? options.foreground : options.background;
        ctx.setFillStyle(style);
        var w = Math.ceil((col + 1) * tileW) - Math.floor(col * tileW);
        var h = Math.ceil((row + 1) * tileW) - Math.floor(row * tileW);
        ctx.fillRect(Math.round(col * tileW), Math.round(row * tileH), w, h);
      }
    }
    ctx.draw();
  }
}

return drawQrcode;

})));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VhcHAucXJjb2RlLmpzIiwic291cmNlcyI6WyIuLi9zcmMvcXJjb2RlLmpzIiwiLi4vc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUkNvZGUgZm9yIEphdmFTY3JpcHRcbi8vXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgS2F6dWhpa28gQXJhc2Vcbi8vXG4vLyBVUkw6IGh0dHA6Ly93d3cuZC1wcm9qZWN0LmNvbS9cbi8vXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2U6XG4vLyAgIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4vL1xuLy8gVGhlIHdvcmQgXCJRUiBDb2RlXCIgaXMgcmVnaXN0ZXJlZCB0cmFkZW1hcmsgb2YgXG4vLyBERU5TTyBXQVZFIElOQ09SUE9SQVRFRFxuLy8gICBodHRwOi8vd3d3LmRlbnNvLXdhdmUuY29tL3FyY29kZS9mYXFwYXRlbnQtZS5odG1sXG4vL1xuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSOGJpdEJ5dGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIFFSOGJpdEJ5dGUoZGF0YSkge1xuICB0aGlzLm1vZGUgPSBRUk1vZGUuTU9ERV84QklUX0JZVEU7XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG59XG5cblFSOGJpdEJ5dGUucHJvdG90eXBlID0ge1xuXG4gIGdldExlbmd0aCA6IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIHJldHVybiB0aGlzLmRhdGEubGVuZ3RoO1xuICB9LFxuICBcbiAgd3JpdGUgOiBmdW5jdGlvbihidWZmZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gbm90IEpJUyAuLi5cbiAgICAgIGJ1ZmZlci5wdXQodGhpcy5kYXRhLmNoYXJDb2RlQXQoaSksIDgpO1xuICAgIH1cbiAgfVxufTtcblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSQ29kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gUVJDb2RlKHR5cGVOdW1iZXIsIGVycm9yQ29ycmVjdExldmVsKSB7XG4gIHRoaXMudHlwZU51bWJlciA9IHR5cGVOdW1iZXI7XG4gIHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwgPSBlcnJvckNvcnJlY3RMZXZlbDtcbiAgdGhpcy5tb2R1bGVzID0gbnVsbDtcbiAgdGhpcy5tb2R1bGVDb3VudCA9IDA7XG4gIHRoaXMuZGF0YUNhY2hlID0gbnVsbDtcbiAgdGhpcy5kYXRhTGlzdCA9IG5ldyBBcnJheSgpO1xufVxuXG5RUkNvZGUucHJvdG90eXBlID0ge1xuICBcbiAgYWRkRGF0YSA6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgbmV3RGF0YSA9IG5ldyBRUjhiaXRCeXRlKGRhdGEpO1xuICAgIHRoaXMuZGF0YUxpc3QucHVzaChuZXdEYXRhKTtcbiAgICB0aGlzLmRhdGFDYWNoZSA9IG51bGw7XG4gIH0sXG4gIFxuICBpc0RhcmsgOiBmdW5jdGlvbihyb3csIGNvbCkge1xuICAgIGlmIChyb3cgPCAwIHx8IHRoaXMubW9kdWxlQ291bnQgPD0gcm93IHx8IGNvbCA8IDAgfHwgdGhpcy5tb2R1bGVDb3VudCA8PSBjb2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihyb3cgKyBcIixcIiArIGNvbCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZHVsZXNbcm93XVtjb2xdO1xuICB9LFxuXG4gIGdldE1vZHVsZUNvdW50IDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlQ291bnQ7XG4gIH0sXG4gIFxuICBtYWtlIDogZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2FsY3VsYXRlIGF1dG9tYXRpY2FsbHkgdHlwZU51bWJlciBpZiBwcm92aWRlZCBpcyA8IDFcbiAgICBpZiAodGhpcy50eXBlTnVtYmVyIDwgMSApe1xuICAgICAgdmFyIHR5cGVOdW1iZXIgPSAxO1xuICAgICAgZm9yICh0eXBlTnVtYmVyID0gMTsgdHlwZU51bWJlciA8IDQwOyB0eXBlTnVtYmVyKyspIHtcbiAgICAgICAgdmFyIHJzQmxvY2tzID0gUVJSU0Jsb2NrLmdldFJTQmxvY2tzKHR5cGVOdW1iZXIsIHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwpO1xuXG4gICAgICAgIHZhciBidWZmZXIgPSBuZXcgUVJCaXRCdWZmZXIoKTtcbiAgICAgICAgdmFyIHRvdGFsRGF0YUNvdW50ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByc0Jsb2Nrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHRvdGFsRGF0YUNvdW50ICs9IHJzQmxvY2tzW2ldLmRhdGFDb3VudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kYXRhTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhTGlzdFtpXTtcbiAgICAgICAgICBidWZmZXIucHV0KGRhdGEubW9kZSwgNCk7XG4gICAgICAgICAgYnVmZmVyLnB1dChkYXRhLmdldExlbmd0aCgpLCBRUlV0aWwuZ2V0TGVuZ3RoSW5CaXRzKGRhdGEubW9kZSwgdHlwZU51bWJlcikgKTtcbiAgICAgICAgICBkYXRhLndyaXRlKGJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSA8PSB0b3RhbERhdGFDb3VudCAqIDgpXG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLnR5cGVOdW1iZXIgPSB0eXBlTnVtYmVyO1xuICAgIH1cbiAgICB0aGlzLm1ha2VJbXBsKGZhbHNlLCB0aGlzLmdldEJlc3RNYXNrUGF0dGVybigpICk7XG4gIH0sXG4gIFxuICBtYWtlSW1wbCA6IGZ1bmN0aW9uKHRlc3QsIG1hc2tQYXR0ZXJuKSB7XG4gICAgXG4gICAgdGhpcy5tb2R1bGVDb3VudCA9IHRoaXMudHlwZU51bWJlciAqIDQgKyAxNztcbiAgICB0aGlzLm1vZHVsZXMgPSBuZXcgQXJyYXkodGhpcy5tb2R1bGVDb3VudCk7XG4gICAgXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgdGhpcy5tb2R1bGVDb3VudDsgcm93KyspIHtcbiAgICAgIFxuICAgICAgdGhpcy5tb2R1bGVzW3Jvd10gPSBuZXcgQXJyYXkodGhpcy5tb2R1bGVDb3VudCk7XG4gICAgICBcbiAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IHRoaXMubW9kdWxlQ291bnQ7IGNvbCsrKSB7XG4gICAgICAgIHRoaXMubW9kdWxlc1tyb3ddW2NvbF0gPSBudWxsOy8vKGNvbCArIHJvdykgJSAzO1xuICAgICAgfVxuICAgIH1cbiAgXG4gICAgdGhpcy5zZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKDAsIDApO1xuICAgIHRoaXMuc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybih0aGlzLm1vZHVsZUNvdW50IC0gNywgMCk7XG4gICAgdGhpcy5zZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKDAsIHRoaXMubW9kdWxlQ291bnQgLSA3KTtcbiAgICB0aGlzLnNldHVwUG9zaXRpb25BZGp1c3RQYXR0ZXJuKCk7XG4gICAgdGhpcy5zZXR1cFRpbWluZ1BhdHRlcm4oKTtcbiAgICB0aGlzLnNldHVwVHlwZUluZm8odGVzdCwgbWFza1BhdHRlcm4pO1xuICAgIFxuICAgIGlmICh0aGlzLnR5cGVOdW1iZXIgPj0gNykge1xuICAgICAgdGhpcy5zZXR1cFR5cGVOdW1iZXIodGVzdCk7XG4gICAgfVxuICBcbiAgICBpZiAodGhpcy5kYXRhQ2FjaGUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5kYXRhQ2FjaGUgPSBRUkNvZGUuY3JlYXRlRGF0YSh0aGlzLnR5cGVOdW1iZXIsIHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwsIHRoaXMuZGF0YUxpc3QpO1xuICAgIH1cbiAgXG4gICAgdGhpcy5tYXBEYXRhKHRoaXMuZGF0YUNhY2hlLCBtYXNrUGF0dGVybik7XG4gIH0sXG5cbiAgc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybiA6IGZ1bmN0aW9uKHJvdywgY29sKSAge1xuICAgIFxuICAgIGZvciAodmFyIHIgPSAtMTsgciA8PSA3OyByKyspIHtcbiAgICAgIFxuICAgICAgaWYgKHJvdyArIHIgPD0gLTEgfHwgdGhpcy5tb2R1bGVDb3VudCA8PSByb3cgKyByKSBjb250aW51ZTtcbiAgICAgIFxuICAgICAgZm9yICh2YXIgYyA9IC0xOyBjIDw9IDc7IGMrKykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbCArIGMgPD0gLTEgfHwgdGhpcy5tb2R1bGVDb3VudCA8PSBjb2wgKyBjKSBjb250aW51ZTtcbiAgICAgICAgXG4gICAgICAgIGlmICggKDAgPD0gciAmJiByIDw9IDYgJiYgKGMgPT0gMCB8fCBjID09IDYpIClcbiAgICAgICAgICAgIHx8ICgwIDw9IGMgJiYgYyA8PSA2ICYmIChyID09IDAgfHwgciA9PSA2KSApXG4gICAgICAgICAgICB8fCAoMiA8PSByICYmIHIgPD0gNCAmJiAyIDw9IGMgJiYgYyA8PSA0KSApIHtcbiAgICAgICAgICB0aGlzLm1vZHVsZXNbcm93ICsgcl1bY29sICsgY10gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubW9kdWxlc1tyb3cgKyByXVtjb2wgKyBjXSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9ICAgXG4gICAgfSAgIFxuICB9LFxuICBcbiAgZ2V0QmVzdE1hc2tQYXR0ZXJuIDogZnVuY3Rpb24oKSB7XG4gIFxuICAgIHZhciBtaW5Mb3N0UG9pbnQgPSAwO1xuICAgIHZhciBwYXR0ZXJuID0gMDtcbiAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgIFxuICAgICAgdGhpcy5tYWtlSW1wbCh0cnVlLCBpKTtcbiAgXG4gICAgICB2YXIgbG9zdFBvaW50ID0gUVJVdGlsLmdldExvc3RQb2ludCh0aGlzKTtcbiAgXG4gICAgICBpZiAoaSA9PSAwIHx8IG1pbkxvc3RQb2ludCA+ICBsb3N0UG9pbnQpIHtcbiAgICAgICAgbWluTG9zdFBvaW50ID0gbG9zdFBvaW50O1xuICAgICAgICBwYXR0ZXJuID0gaTtcbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIHJldHVybiBwYXR0ZXJuO1xuICB9LFxuICBcbiAgY3JlYXRlTW92aWVDbGlwIDogZnVuY3Rpb24odGFyZ2V0X21jLCBpbnN0YW5jZV9uYW1lLCBkZXB0aCkge1xuICBcbiAgICB2YXIgcXJfbWMgPSB0YXJnZXRfbWMuY3JlYXRlRW1wdHlNb3ZpZUNsaXAoaW5zdGFuY2VfbmFtZSwgZGVwdGgpO1xuICAgIHZhciBjcyA9IDE7XG4gIFxuICAgIHRoaXMubWFrZSgpO1xuXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgdGhpcy5tb2R1bGVzLmxlbmd0aDsgcm93KyspIHtcbiAgICAgIFxuICAgICAgdmFyIHkgPSByb3cgKiBjcztcbiAgICAgIFxuICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgdGhpcy5tb2R1bGVzW3Jvd10ubGVuZ3RoOyBjb2wrKykge1xuICBcbiAgICAgICAgdmFyIHggPSBjb2wgKiBjcztcbiAgICAgICAgdmFyIGRhcmsgPSB0aGlzLm1vZHVsZXNbcm93XVtjb2xdO1xuICAgICAgXG4gICAgICAgIGlmIChkYXJrKSB7XG4gICAgICAgICAgcXJfbWMuYmVnaW5GaWxsKDAsIDEwMCk7XG4gICAgICAgICAgcXJfbWMubW92ZVRvKHgsIHkpO1xuICAgICAgICAgIHFyX21jLmxpbmVUbyh4ICsgY3MsIHkpO1xuICAgICAgICAgIHFyX21jLmxpbmVUbyh4ICsgY3MsIHkgKyBjcyk7XG4gICAgICAgICAgcXJfbWMubGluZVRvKHgsIHkgKyBjcyk7XG4gICAgICAgICAgcXJfbWMuZW5kRmlsbCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBxcl9tYztcbiAgfSxcblxuICBzZXR1cFRpbWluZ1BhdHRlcm4gOiBmdW5jdGlvbigpIHtcbiAgICBcbiAgICBmb3IgKHZhciByID0gODsgciA8IHRoaXMubW9kdWxlQ291bnQgLSA4OyByKyspIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXNbcl1bNl0gIT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMubW9kdWxlc1tyXVs2XSA9IChyICUgMiA9PSAwKTtcbiAgICB9XG4gIFxuICAgIGZvciAodmFyIGMgPSA4OyBjIDwgdGhpcy5tb2R1bGVDb3VudCAtIDg7IGMrKykge1xuICAgICAgaWYgKHRoaXMubW9kdWxlc1s2XVtjXSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5tb2R1bGVzWzZdW2NdID0gKGMgJSAyID09IDApO1xuICAgIH1cbiAgfSxcbiAgXG4gIHNldHVwUG9zaXRpb25BZGp1c3RQYXR0ZXJuIDogZnVuY3Rpb24oKSB7XG4gIFxuICAgIHZhciBwb3MgPSBRUlV0aWwuZ2V0UGF0dGVyblBvc2l0aW9uKHRoaXMudHlwZU51bWJlcik7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb3MubGVuZ3RoOyBpKyspIHtcbiAgICBcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcG9zLmxlbmd0aDsgaisrKSB7XG4gICAgICBcbiAgICAgICAgdmFyIHJvdyA9IHBvc1tpXTtcbiAgICAgICAgdmFyIGNvbCA9IHBvc1tqXTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZXNbcm93XVtjb2xdICE9IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgciA9IC0yOyByIDw9IDI7IHIrKykge1xuICAgICAgICBcbiAgICAgICAgICBmb3IgKHZhciBjID0gLTI7IGMgPD0gMjsgYysrKSB7XG4gICAgICAgICAgXG4gICAgICAgICAgICBpZiAociA9PSAtMiB8fCByID09IDIgfHwgYyA9PSAtMiB8fCBjID09IDIgXG4gICAgICAgICAgICAgICAgfHwgKHIgPT0gMCAmJiBjID09IDApICkge1xuICAgICAgICAgICAgICB0aGlzLm1vZHVsZXNbcm93ICsgcl1bY29sICsgY10gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5tb2R1bGVzW3JvdyArIHJdW2NvbCArIGNdID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcbiAgc2V0dXBUeXBlTnVtYmVyIDogZnVuY3Rpb24odGVzdCkge1xuICBcbiAgICB2YXIgYml0cyA9IFFSVXRpbC5nZXRCQ0hUeXBlTnVtYmVyKHRoaXMudHlwZU51bWJlcik7XG4gIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTg7IGkrKykge1xuICAgICAgdmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG4gICAgICB0aGlzLm1vZHVsZXNbTWF0aC5mbG9vcihpIC8gMyldW2kgJSAzICsgdGhpcy5tb2R1bGVDb3VudCAtIDggLSAzXSA9IG1vZDtcbiAgICB9XG4gIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTg7IGkrKykge1xuICAgICAgdmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG4gICAgICB0aGlzLm1vZHVsZXNbaSAlIDMgKyB0aGlzLm1vZHVsZUNvdW50IC0gOCAtIDNdW01hdGguZmxvb3IoaSAvIDMpXSA9IG1vZDtcbiAgICB9XG4gIH0sXG4gIFxuICBzZXR1cFR5cGVJbmZvIDogZnVuY3Rpb24odGVzdCwgbWFza1BhdHRlcm4pIHtcbiAgXG4gICAgdmFyIGRhdGEgPSAodGhpcy5lcnJvckNvcnJlY3RMZXZlbCA8PCAzKSB8IG1hc2tQYXR0ZXJuO1xuICAgIHZhciBiaXRzID0gUVJVdGlsLmdldEJDSFR5cGVJbmZvKGRhdGEpO1xuICBcbiAgICAvLyB2ZXJ0aWNhbCAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTU7IGkrKykge1xuICBcbiAgICAgIHZhciBtb2QgPSAoIXRlc3QgJiYgKCAoYml0cyA+PiBpKSAmIDEpID09IDEpO1xuICBcbiAgICAgIGlmIChpIDwgNikge1xuICAgICAgICB0aGlzLm1vZHVsZXNbaV1bOF0gPSBtb2Q7XG4gICAgICB9IGVsc2UgaWYgKGkgPCA4KSB7XG4gICAgICAgIHRoaXMubW9kdWxlc1tpICsgMV1bOF0gPSBtb2Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1vZHVsZXNbdGhpcy5tb2R1bGVDb3VudCAtIDE1ICsgaV1bOF0gPSBtb2Q7XG4gICAgICB9XG4gICAgfVxuICBcbiAgICAvLyBob3Jpem9udGFsXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNTsgaSsrKSB7XG4gIFxuICAgICAgdmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG4gICAgICBcbiAgICAgIGlmIChpIDwgOCkge1xuICAgICAgICB0aGlzLm1vZHVsZXNbOF1bdGhpcy5tb2R1bGVDb3VudCAtIGkgLSAxXSA9IG1vZDtcbiAgICAgIH0gZWxzZSBpZiAoaSA8IDkpIHtcbiAgICAgICAgdGhpcy5tb2R1bGVzWzhdWzE1IC0gaSAtIDEgKyAxXSA9IG1vZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubW9kdWxlc1s4XVsxNSAtIGkgLSAxXSA9IG1vZDtcbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIC8vIGZpeGVkIG1vZHVsZVxuICAgIHRoaXMubW9kdWxlc1t0aGlzLm1vZHVsZUNvdW50IC0gOF1bOF0gPSAoIXRlc3QpO1xuICBcbiAgfSxcbiAgXG4gIG1hcERhdGEgOiBmdW5jdGlvbihkYXRhLCBtYXNrUGF0dGVybikge1xuICAgIFxuICAgIHZhciBpbmMgPSAtMTtcbiAgICB2YXIgcm93ID0gdGhpcy5tb2R1bGVDb3VudCAtIDE7XG4gICAgdmFyIGJpdEluZGV4ID0gNztcbiAgICB2YXIgYnl0ZUluZGV4ID0gMDtcbiAgICBcbiAgICBmb3IgKHZhciBjb2wgPSB0aGlzLm1vZHVsZUNvdW50IC0gMTsgY29sID4gMDsgY29sIC09IDIpIHtcbiAgXG4gICAgICBpZiAoY29sID09IDYpIGNvbC0tO1xuICBcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gIFxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IDI7IGMrKykge1xuICAgICAgICAgIFxuICAgICAgICAgIGlmICh0aGlzLm1vZHVsZXNbcm93XVtjb2wgLSBjXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkYXJrID0gZmFsc2U7XG4gIFxuICAgICAgICAgICAgaWYgKGJ5dGVJbmRleCA8IGRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGRhcmsgPSAoICggKGRhdGFbYnl0ZUluZGV4XSA+Pj4gYml0SW5kZXgpICYgMSkgPT0gMSk7XG4gICAgICAgICAgICB9XG4gIFxuICAgICAgICAgICAgdmFyIG1hc2sgPSBRUlV0aWwuZ2V0TWFzayhtYXNrUGF0dGVybiwgcm93LCBjb2wgLSBjKTtcbiAgXG4gICAgICAgICAgICBpZiAobWFzaykge1xuICAgICAgICAgICAgICBkYXJrID0gIWRhcms7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubW9kdWxlc1tyb3ddW2NvbCAtIGNdID0gZGFyaztcbiAgICAgICAgICAgIGJpdEluZGV4LS07XG4gIFxuICAgICAgICAgICAgaWYgKGJpdEluZGV4ID09IC0xKSB7XG4gICAgICAgICAgICAgIGJ5dGVJbmRleCsrO1xuICAgICAgICAgICAgICBiaXRJbmRleCA9IDc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIHJvdyArPSBpbmM7XG4gIFxuICAgICAgICBpZiAocm93IDwgMCB8fCB0aGlzLm1vZHVsZUNvdW50IDw9IHJvdykge1xuICAgICAgICAgIHJvdyAtPSBpbmM7XG4gICAgICAgICAgaW5jID0gLWluYztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBcbiAgfVxuXG59O1xuXG5RUkNvZGUuUEFEMCA9IDB4RUM7XG5RUkNvZGUuUEFEMSA9IDB4MTE7XG5cblFSQ29kZS5jcmVhdGVEYXRhID0gZnVuY3Rpb24odHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwsIGRhdGFMaXN0KSB7XG4gIFxuICB2YXIgcnNCbG9ja3MgPSBRUlJTQmxvY2suZ2V0UlNCbG9ja3ModHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpO1xuICBcbiAgdmFyIGJ1ZmZlciA9IG5ldyBRUkJpdEJ1ZmZlcigpO1xuICBcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBkYXRhID0gZGF0YUxpc3RbaV07XG4gICAgYnVmZmVyLnB1dChkYXRhLm1vZGUsIDQpO1xuICAgIGJ1ZmZlci5wdXQoZGF0YS5nZXRMZW5ndGgoKSwgUVJVdGlsLmdldExlbmd0aEluQml0cyhkYXRhLm1vZGUsIHR5cGVOdW1iZXIpICk7XG4gICAgZGF0YS53cml0ZShidWZmZXIpO1xuICB9XG5cbiAgLy8gY2FsYyBudW0gbWF4IGRhdGEuXG4gIHZhciB0b3RhbERhdGFDb3VudCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcnNCbG9ja3MubGVuZ3RoOyBpKyspIHtcbiAgICB0b3RhbERhdGFDb3VudCArPSByc0Jsb2Nrc1tpXS5kYXRhQ291bnQ7XG4gIH1cblxuICBpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpID4gdG90YWxEYXRhQ291bnQgKiA4KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiY29kZSBsZW5ndGggb3ZlcmZsb3cuIChcIlxuICAgICAgKyBidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKClcbiAgICAgICsgXCI+XCJcbiAgICAgICsgIHRvdGFsRGF0YUNvdW50ICogOFxuICAgICAgKyBcIilcIik7XG4gIH1cblxuICAvLyBlbmQgY29kZVxuICBpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpICsgNCA8PSB0b3RhbERhdGFDb3VudCAqIDgpIHtcbiAgICBidWZmZXIucHV0KDAsIDQpO1xuICB9XG5cbiAgLy8gcGFkZGluZ1xuICB3aGlsZSAoYnVmZmVyLmdldExlbmd0aEluQml0cygpICUgOCAhPSAwKSB7XG4gICAgYnVmZmVyLnB1dEJpdChmYWxzZSk7XG4gIH1cblxuICAvLyBwYWRkaW5nXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgXG4gICAgaWYgKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSA+PSB0b3RhbERhdGFDb3VudCAqIDgpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBidWZmZXIucHV0KFFSQ29kZS5QQUQwLCA4KTtcbiAgICBcbiAgICBpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpID49IHRvdGFsRGF0YUNvdW50ICogOCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGJ1ZmZlci5wdXQoUVJDb2RlLlBBRDEsIDgpO1xuICB9XG5cbiAgcmV0dXJuIFFSQ29kZS5jcmVhdGVCeXRlcyhidWZmZXIsIHJzQmxvY2tzKTtcbn1cblxuUVJDb2RlLmNyZWF0ZUJ5dGVzID0gZnVuY3Rpb24oYnVmZmVyLCByc0Jsb2Nrcykge1xuXG4gIHZhciBvZmZzZXQgPSAwO1xuICBcbiAgdmFyIG1heERjQ291bnQgPSAwO1xuICB2YXIgbWF4RWNDb3VudCA9IDA7XG4gIFxuICB2YXIgZGNkYXRhID0gbmV3IEFycmF5KHJzQmxvY2tzLmxlbmd0aCk7XG4gIHZhciBlY2RhdGEgPSBuZXcgQXJyYXkocnNCbG9ja3MubGVuZ3RoKTtcbiAgXG4gIGZvciAodmFyIHIgPSAwOyByIDwgcnNCbG9ja3MubGVuZ3RoOyByKyspIHtcblxuICAgIHZhciBkY0NvdW50ID0gcnNCbG9ja3Nbcl0uZGF0YUNvdW50O1xuICAgIHZhciBlY0NvdW50ID0gcnNCbG9ja3Nbcl0udG90YWxDb3VudCAtIGRjQ291bnQ7XG5cbiAgICBtYXhEY0NvdW50ID0gTWF0aC5tYXgobWF4RGNDb3VudCwgZGNDb3VudCk7XG4gICAgbWF4RWNDb3VudCA9IE1hdGgubWF4KG1heEVjQ291bnQsIGVjQ291bnQpO1xuICAgIFxuICAgIGRjZGF0YVtyXSA9IG5ldyBBcnJheShkY0NvdW50KTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRjZGF0YVtyXS5sZW5ndGg7IGkrKykge1xuICAgICAgZGNkYXRhW3JdW2ldID0gMHhmZiAmIGJ1ZmZlci5idWZmZXJbaSArIG9mZnNldF07XG4gICAgfVxuICAgIG9mZnNldCArPSBkY0NvdW50O1xuICAgIFxuICAgIHZhciByc1BvbHkgPSBRUlV0aWwuZ2V0RXJyb3JDb3JyZWN0UG9seW5vbWlhbChlY0NvdW50KTtcbiAgICB2YXIgcmF3UG9seSA9IG5ldyBRUlBvbHlub21pYWwoZGNkYXRhW3JdLCByc1BvbHkuZ2V0TGVuZ3RoKCkgLSAxKTtcblxuICAgIHZhciBtb2RQb2x5ID0gcmF3UG9seS5tb2QocnNQb2x5KTtcbiAgICBlY2RhdGFbcl0gPSBuZXcgQXJyYXkocnNQb2x5LmdldExlbmd0aCgpIC0gMSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlY2RhdGFbcl0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtb2RJbmRleCA9IGkgKyBtb2RQb2x5LmdldExlbmd0aCgpIC0gZWNkYXRhW3JdLmxlbmd0aDtcbiAgICAgIGVjZGF0YVtyXVtpXSA9IChtb2RJbmRleCA+PSAwKT8gbW9kUG9seS5nZXQobW9kSW5kZXgpIDogMDtcbiAgICB9XG5cbiAgfVxuICBcbiAgdmFyIHRvdGFsQ29kZUNvdW50ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByc0Jsb2Nrcy5sZW5ndGg7IGkrKykge1xuICAgIHRvdGFsQ29kZUNvdW50ICs9IHJzQmxvY2tzW2ldLnRvdGFsQ291bnQ7XG4gIH1cblxuICB2YXIgZGF0YSA9IG5ldyBBcnJheSh0b3RhbENvZGVDb3VudCk7XG4gIHZhciBpbmRleCA9IDA7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhEY0NvdW50OyBpKyspIHtcbiAgICBmb3IgKHZhciByID0gMDsgciA8IHJzQmxvY2tzLmxlbmd0aDsgcisrKSB7XG4gICAgICBpZiAoaSA8IGRjZGF0YVtyXS5sZW5ndGgpIHtcbiAgICAgICAgZGF0YVtpbmRleCsrXSA9IGRjZGF0YVtyXVtpXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG1heEVjQ291bnQ7IGkrKykge1xuICAgIGZvciAodmFyIHIgPSAwOyByIDwgcnNCbG9ja3MubGVuZ3RoOyByKyspIHtcbiAgICAgIGlmIChpIDwgZWNkYXRhW3JdLmxlbmd0aCkge1xuICAgICAgICBkYXRhW2luZGV4KytdID0gZWNkYXRhW3JdW2ldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkYXRhO1xuXG59XG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUk1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBRUk1vZGUgPSB7XG4gIE1PREVfTlVNQkVSIDogICAxIDw8IDAsXG4gIE1PREVfQUxQSEFfTlVNIDogIDEgPDwgMSxcbiAgTU9ERV84QklUX0JZVEUgOiAgMSA8PCAyLFxuICBNT0RFX0tBTkpJIDogICAgMSA8PCAzXG59O1xuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUVJFcnJvckNvcnJlY3RMZXZlbFxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiBcbnZhciBRUkVycm9yQ29ycmVjdExldmVsID0ge1xuICBMIDogMSxcbiAgTSA6IDAsXG4gIFEgOiAzLFxuICBIIDogMlxufTtcblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSTWFza1BhdHRlcm5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBRUk1hc2tQYXR0ZXJuID0ge1xuICBQQVRURVJOMDAwIDogMCxcbiAgUEFUVEVSTjAwMSA6IDEsXG4gIFBBVFRFUk4wMTAgOiAyLFxuICBQQVRURVJOMDExIDogMyxcbiAgUEFUVEVSTjEwMCA6IDQsXG4gIFBBVFRFUk4xMDEgOiA1LFxuICBQQVRURVJOMTEwIDogNixcbiAgUEFUVEVSTjExMSA6IDdcbn07XG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUlV0aWxcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gXG52YXIgUVJVdGlsID0ge1xuXG4gICAgUEFUVEVSTl9QT1NJVElPTl9UQUJMRSA6IFtcbiAgICAgIFtdLFxuICAgICAgWzYsIDE4XSxcbiAgICAgIFs2LCAyMl0sXG4gICAgICBbNiwgMjZdLFxuICAgICAgWzYsIDMwXSxcbiAgICAgIFs2LCAzNF0sXG4gICAgICBbNiwgMjIsIDM4XSxcbiAgICAgIFs2LCAyNCwgNDJdLFxuICAgICAgWzYsIDI2LCA0Nl0sXG4gICAgICBbNiwgMjgsIDUwXSxcbiAgICAgIFs2LCAzMCwgNTRdLCAgICBcbiAgICAgIFs2LCAzMiwgNThdLFxuICAgICAgWzYsIDM0LCA2Ml0sXG4gICAgICBbNiwgMjYsIDQ2LCA2Nl0sXG4gICAgICBbNiwgMjYsIDQ4LCA3MF0sXG4gICAgICBbNiwgMjYsIDUwLCA3NF0sXG4gICAgICBbNiwgMzAsIDU0LCA3OF0sXG4gICAgICBbNiwgMzAsIDU2LCA4Ml0sXG4gICAgICBbNiwgMzAsIDU4LCA4Nl0sXG4gICAgICBbNiwgMzQsIDYyLCA5MF0sXG4gICAgICBbNiwgMjgsIDUwLCA3MiwgOTRdLFxuICAgICAgWzYsIDI2LCA1MCwgNzQsIDk4XSxcbiAgICAgIFs2LCAzMCwgNTQsIDc4LCAxMDJdLFxuICAgICAgWzYsIDI4LCA1NCwgODAsIDEwNl0sXG4gICAgICBbNiwgMzIsIDU4LCA4NCwgMTEwXSxcbiAgICAgIFs2LCAzMCwgNTgsIDg2LCAxMTRdLFxuICAgICAgWzYsIDM0LCA2MiwgOTAsIDExOF0sXG4gICAgICBbNiwgMjYsIDUwLCA3NCwgOTgsIDEyMl0sXG4gICAgICBbNiwgMzAsIDU0LCA3OCwgMTAyLCAxMjZdLFxuICAgICAgWzYsIDI2LCA1MiwgNzgsIDEwNCwgMTMwXSxcbiAgICAgIFs2LCAzMCwgNTYsIDgyLCAxMDgsIDEzNF0sXG4gICAgICBbNiwgMzQsIDYwLCA4NiwgMTEyLCAxMzhdLFxuICAgICAgWzYsIDMwLCA1OCwgODYsIDExNCwgMTQyXSxcbiAgICAgIFs2LCAzNCwgNjIsIDkwLCAxMTgsIDE0Nl0sXG4gICAgICBbNiwgMzAsIDU0LCA3OCwgMTAyLCAxMjYsIDE1MF0sXG4gICAgICBbNiwgMjQsIDUwLCA3NiwgMTAyLCAxMjgsIDE1NF0sXG4gICAgICBbNiwgMjgsIDU0LCA4MCwgMTA2LCAxMzIsIDE1OF0sXG4gICAgICBbNiwgMzIsIDU4LCA4NCwgMTEwLCAxMzYsIDE2Ml0sXG4gICAgICBbNiwgMjYsIDU0LCA4MiwgMTEwLCAxMzgsIDE2Nl0sXG4gICAgICBbNiwgMzAsIDU4LCA4NiwgMTE0LCAxNDIsIDE3MF1cbiAgICBdLFxuXG4gICAgRzE1IDogKDEgPDwgMTApIHwgKDEgPDwgOCkgfCAoMSA8PCA1KSB8ICgxIDw8IDQpIHwgKDEgPDwgMikgfCAoMSA8PCAxKSB8ICgxIDw8IDApLFxuICAgIEcxOCA6ICgxIDw8IDEyKSB8ICgxIDw8IDExKSB8ICgxIDw8IDEwKSB8ICgxIDw8IDkpIHwgKDEgPDwgOCkgfCAoMSA8PCA1KSB8ICgxIDw8IDIpIHwgKDEgPDwgMCksXG4gICAgRzE1X01BU0sgOiAoMSA8PCAxNCkgfCAoMSA8PCAxMikgfCAoMSA8PCAxMCkgIHwgKDEgPDwgNCkgfCAoMSA8PCAxKSxcblxuICAgIGdldEJDSFR5cGVJbmZvIDogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIGQgPSBkYXRhIDw8IDEwO1xuICAgICAgd2hpbGUgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE1KSA+PSAwKSB7XG4gICAgICAgIGQgXj0gKFFSVXRpbC5HMTUgPDwgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE1KSApICk7ICBcbiAgICAgIH1cbiAgICAgIHJldHVybiAoIChkYXRhIDw8IDEwKSB8IGQpIF4gUVJVdGlsLkcxNV9NQVNLO1xuICAgIH0sXG5cbiAgICBnZXRCQ0hUeXBlTnVtYmVyIDogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIGQgPSBkYXRhIDw8IDEyO1xuICAgICAgd2hpbGUgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE4KSA+PSAwKSB7XG4gICAgICAgIGQgXj0gKFFSVXRpbC5HMTggPDwgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE4KSApICk7ICBcbiAgICAgIH1cbiAgICAgIHJldHVybiAoZGF0YSA8PCAxMikgfCBkO1xuICAgIH0sXG5cbiAgICBnZXRCQ0hEaWdpdCA6IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgdmFyIGRpZ2l0ID0gMDtcblxuICAgICAgd2hpbGUgKGRhdGEgIT0gMCkge1xuICAgICAgICBkaWdpdCsrO1xuICAgICAgICBkYXRhID4+Pj0gMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpZ2l0O1xuICAgIH0sXG5cbiAgICBnZXRQYXR0ZXJuUG9zaXRpb24gOiBmdW5jdGlvbih0eXBlTnVtYmVyKSB7XG4gICAgICByZXR1cm4gUVJVdGlsLlBBVFRFUk5fUE9TSVRJT05fVEFCTEVbdHlwZU51bWJlciAtIDFdO1xuICAgIH0sXG5cbiAgICBnZXRNYXNrIDogZnVuY3Rpb24obWFza1BhdHRlcm4sIGksIGopIHtcbiAgICAgIFxuICAgICAgc3dpdGNoIChtYXNrUGF0dGVybikge1xuICAgICAgICBcbiAgICAgIGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDAwIDogcmV0dXJuIChpICsgaikgJSAyID09IDA7XG4gICAgICBjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjAwMSA6IHJldHVybiBpICUgMiA9PSAwO1xuICAgICAgY2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4wMTAgOiByZXR1cm4gaiAlIDMgPT0gMDtcbiAgICAgIGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDExIDogcmV0dXJuIChpICsgaikgJSAzID09IDA7XG4gICAgICBjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjEwMCA6IHJldHVybiAoTWF0aC5mbG9vcihpIC8gMikgKyBNYXRoLmZsb29yKGogLyAzKSApICUgMiA9PSAwO1xuICAgICAgY2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMDEgOiByZXR1cm4gKGkgKiBqKSAlIDIgKyAoaSAqIGopICUgMyA9PSAwO1xuICAgICAgY2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMTAgOiByZXR1cm4gKCAoaSAqIGopICUgMiArIChpICogaikgJSAzKSAlIDIgPT0gMDtcbiAgICAgIGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMTExIDogcmV0dXJuICggKGkgKiBqKSAlIDMgKyAoaSArIGopICUgMikgJSAyID09IDA7XG5cbiAgICAgIGRlZmF1bHQgOlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgbWFza1BhdHRlcm46XCIgKyBtYXNrUGF0dGVybik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGdldEVycm9yQ29ycmVjdFBvbHlub21pYWwgOiBmdW5jdGlvbihlcnJvckNvcnJlY3RMZW5ndGgpIHtcblxuICAgICAgdmFyIGEgPSBuZXcgUVJQb2x5bm9taWFsKFsxXSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXJyb3JDb3JyZWN0TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYSA9IGEubXVsdGlwbHkobmV3IFFSUG9seW5vbWlhbChbMSwgUVJNYXRoLmdleHAoaSldLCAwKSApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYTtcbiAgICB9LFxuXG4gICAgZ2V0TGVuZ3RoSW5CaXRzIDogZnVuY3Rpb24obW9kZSwgdHlwZSkge1xuXG4gICAgICBpZiAoMSA8PSB0eXBlICYmIHR5cGUgPCAxMCkge1xuXG4gICAgICAgIC8vIDEgLSA5XG5cbiAgICAgICAgc3dpdGNoKG1vZGUpIHtcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV9OVU1CRVIgICA6IHJldHVybiAxMDtcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV9BTFBIQV9OVU0gIDogcmV0dXJuIDk7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFICA6IHJldHVybiA4O1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX0tBTkpJICAgIDogcmV0dXJuIDg7XG4gICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIm1vZGU6XCIgKyBtb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPCAyNykge1xuXG4gICAgICAgIC8vIDEwIC0gMjZcblxuICAgICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX05VTUJFUiAgIDogcmV0dXJuIDEyO1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX0FMUEhBX05VTSAgOiByZXR1cm4gMTE7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFICA6IHJldHVybiAxNjtcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV9LQU5KSSAgICA6IHJldHVybiAxMDtcbiAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibW9kZTpcIiArIG1vZGUpO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAodHlwZSA8IDQxKSB7XG5cbiAgICAgICAgLy8gMjcgLSA0MFxuXG4gICAgICAgIHN3aXRjaChtb2RlKSB7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfTlVNQkVSICAgOiByZXR1cm4gMTQ7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfQUxQSEFfTlVNICA6IHJldHVybiAxMztcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV84QklUX0JZVEUgIDogcmV0dXJuIDE2O1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX0tBTkpJICAgIDogcmV0dXJuIDEyO1xuICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJtb2RlOlwiICsgbW9kZSk7XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidHlwZTpcIiArIHR5cGUpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRMb3N0UG9pbnQgOiBmdW5jdGlvbihxckNvZGUpIHtcbiAgICAgIFxuICAgICAgdmFyIG1vZHVsZUNvdW50ID0gcXJDb2RlLmdldE1vZHVsZUNvdW50KCk7XG4gICAgICBcbiAgICAgIHZhciBsb3N0UG9pbnQgPSAwO1xuICAgICAgXG4gICAgICAvLyBMRVZFTDFcbiAgICAgIFxuICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbW9kdWxlQ291bnQ7IHJvdysrKSB7XG5cbiAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgbW9kdWxlQ291bnQ7IGNvbCsrKSB7XG5cbiAgICAgICAgICB2YXIgc2FtZUNvdW50ID0gMDtcbiAgICAgICAgICB2YXIgZGFyayA9IHFyQ29kZS5pc0Rhcmsocm93LCBjb2wpO1xuXG4gICAgICAgIGZvciAodmFyIHIgPSAtMTsgciA8PSAxOyByKyspIHtcblxuICAgICAgICAgICAgaWYgKHJvdyArIHIgPCAwIHx8IG1vZHVsZUNvdW50IDw9IHJvdyArIHIpIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAtMTsgYyA8PSAxOyBjKyspIHtcblxuICAgICAgICAgICAgICBpZiAoY29sICsgYyA8IDAgfHwgbW9kdWxlQ291bnQgPD0gY29sICsgYykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHIgPT0gMCAmJiBjID09IDApIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChkYXJrID09IHFyQ29kZS5pc0Rhcmsocm93ICsgciwgY29sICsgYykgKSB7XG4gICAgICAgICAgICAgICAgc2FtZUNvdW50Kys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc2FtZUNvdW50ID4gNSkge1xuICAgICAgICAgICAgbG9zdFBvaW50ICs9ICgzICsgc2FtZUNvdW50IC0gNSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIExFVkVMMlxuXG4gICAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBtb2R1bGVDb3VudCAtIDE7IHJvdysrKSB7XG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1vZHVsZUNvdW50IC0gMTsgY29sKyspIHtcbiAgICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICAgIGlmIChxckNvZGUuaXNEYXJrKHJvdywgICAgIGNvbCAgICApICkgY291bnQrKztcbiAgICAgICAgICBpZiAocXJDb2RlLmlzRGFyayhyb3cgKyAxLCBjb2wgICAgKSApIGNvdW50Kys7XG4gICAgICAgICAgaWYgKHFyQ29kZS5pc0Rhcmsocm93LCAgICAgY29sICsgMSkgKSBjb3VudCsrO1xuICAgICAgICAgIGlmIChxckNvZGUuaXNEYXJrKHJvdyArIDEsIGNvbCArIDEpICkgY291bnQrKztcbiAgICAgICAgICBpZiAoY291bnQgPT0gMCB8fCBjb3VudCA9PSA0KSB7XG4gICAgICAgICAgICBsb3N0UG9pbnQgKz0gMztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTEVWRUwzXG5cbiAgICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IG1vZHVsZUNvdW50OyByb3crKykge1xuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBtb2R1bGVDb3VudCAtIDY7IGNvbCsrKSB7XG4gICAgICAgICAgaWYgKHFyQ29kZS5pc0Rhcmsocm93LCBjb2wpXG4gICAgICAgICAgICAgICYmICFxckNvZGUuaXNEYXJrKHJvdywgY29sICsgMSlcbiAgICAgICAgICAgICAgJiYgIHFyQ29kZS5pc0Rhcmsocm93LCBjb2wgKyAyKVxuICAgICAgICAgICAgICAmJiAgcXJDb2RlLmlzRGFyayhyb3csIGNvbCArIDMpXG4gICAgICAgICAgICAgICYmICBxckNvZGUuaXNEYXJrKHJvdywgY29sICsgNClcbiAgICAgICAgICAgICAgJiYgIXFyQ29kZS5pc0Rhcmsocm93LCBjb2wgKyA1KVxuICAgICAgICAgICAgICAmJiAgcXJDb2RlLmlzRGFyayhyb3csIGNvbCArIDYpICkge1xuICAgICAgICAgICAgbG9zdFBvaW50ICs9IDQwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBtb2R1bGVDb3VudDsgY29sKyspIHtcbiAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbW9kdWxlQ291bnQgLSA2OyByb3crKykge1xuICAgICAgICAgIGlmIChxckNvZGUuaXNEYXJrKHJvdywgY29sKVxuICAgICAgICAgICAgICAmJiAhcXJDb2RlLmlzRGFyayhyb3cgKyAxLCBjb2wpXG4gICAgICAgICAgICAgICYmICBxckNvZGUuaXNEYXJrKHJvdyArIDIsIGNvbClcbiAgICAgICAgICAgICAgJiYgIHFyQ29kZS5pc0Rhcmsocm93ICsgMywgY29sKVxuICAgICAgICAgICAgICAmJiAgcXJDb2RlLmlzRGFyayhyb3cgKyA0LCBjb2wpXG4gICAgICAgICAgICAgICYmICFxckNvZGUuaXNEYXJrKHJvdyArIDUsIGNvbClcbiAgICAgICAgICAgICAgJiYgIHFyQ29kZS5pc0Rhcmsocm93ICsgNiwgY29sKSApIHtcbiAgICAgICAgICAgIGxvc3RQb2ludCArPSA0MDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTEVWRUw0XG4gICAgICBcbiAgICAgIHZhciBkYXJrQ291bnQgPSAwO1xuXG4gICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBtb2R1bGVDb3VudDsgY29sKyspIHtcbiAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbW9kdWxlQ291bnQ7IHJvdysrKSB7XG4gICAgICAgICAgaWYgKHFyQ29kZS5pc0Rhcmsocm93LCBjb2wpICkge1xuICAgICAgICAgICAgZGFya0NvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciByYXRpbyA9IE1hdGguYWJzKDEwMCAqIGRhcmtDb3VudCAvIG1vZHVsZUNvdW50IC8gbW9kdWxlQ291bnQgLSA1MCkgLyA1O1xuICAgICAgbG9zdFBvaW50ICs9IHJhdGlvICogMTA7XG5cbiAgICAgIHJldHVybiBsb3N0UG9pbnQ7ICAgXG4gICAgfVxuXG59O1xuXG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUk1hdGhcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBRUk1hdGggPSB7XG5cbiAgZ2xvZyA6IGZ1bmN0aW9uKG4pIHtcbiAgXG4gICAgaWYgKG4gPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJnbG9nKFwiICsgbiArIFwiKVwiKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIFFSTWF0aC5MT0dfVEFCTEVbbl07XG4gIH0sXG4gIFxuICBnZXhwIDogZnVuY3Rpb24obikge1xuICBcbiAgICB3aGlsZSAobiA8IDApIHtcbiAgICAgIG4gKz0gMjU1O1xuICAgIH1cbiAgXG4gICAgd2hpbGUgKG4gPj0gMjU2KSB7XG4gICAgICBuIC09IDI1NTtcbiAgICB9XG4gIFxuICAgIHJldHVybiBRUk1hdGguRVhQX1RBQkxFW25dO1xuICB9LFxuICBcbiAgRVhQX1RBQkxFIDogbmV3IEFycmF5KDI1NiksXG4gIFxuICBMT0dfVEFCTEUgOiBuZXcgQXJyYXkoMjU2KVxuXG59O1xuICBcbmZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gIFFSTWF0aC5FWFBfVEFCTEVbaV0gPSAxIDw8IGk7XG59XG5mb3IgKHZhciBpID0gODsgaSA8IDI1NjsgaSsrKSB7XG4gIFFSTWF0aC5FWFBfVEFCTEVbaV0gPSBRUk1hdGguRVhQX1RBQkxFW2kgLSA0XVxuICAgIF4gUVJNYXRoLkVYUF9UQUJMRVtpIC0gNV1cbiAgICBeIFFSTWF0aC5FWFBfVEFCTEVbaSAtIDZdXG4gICAgXiBRUk1hdGguRVhQX1RBQkxFW2kgLSA4XTtcbn1cbmZvciAodmFyIGkgPSAwOyBpIDwgMjU1OyBpKyspIHtcbiAgUVJNYXRoLkxPR19UQUJMRVtRUk1hdGguRVhQX1RBQkxFW2ldIF0gPSBpO1xufVxuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUVJQb2x5bm9taWFsXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBRUlBvbHlub21pYWwobnVtLCBzaGlmdCkge1xuXG4gIGlmIChudW0ubGVuZ3RoID09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihudW0ubGVuZ3RoICsgXCIvXCIgKyBzaGlmdCk7XG4gIH1cblxuICB2YXIgb2Zmc2V0ID0gMDtcblxuICB3aGlsZSAob2Zmc2V0IDwgbnVtLmxlbmd0aCAmJiBudW1bb2Zmc2V0XSA9PSAwKSB7XG4gICAgb2Zmc2V0Kys7XG4gIH1cblxuICB0aGlzLm51bSA9IG5ldyBBcnJheShudW0ubGVuZ3RoIC0gb2Zmc2V0ICsgc2hpZnQpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bS5sZW5ndGggLSBvZmZzZXQ7IGkrKykge1xuICAgIHRoaXMubnVtW2ldID0gbnVtW2kgKyBvZmZzZXRdO1xuICB9XG59XG5cblFSUG9seW5vbWlhbC5wcm90b3R5cGUgPSB7XG5cbiAgZ2V0IDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5udW1baW5kZXhdO1xuICB9LFxuICBcbiAgZ2V0TGVuZ3RoIDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubnVtLmxlbmd0aDtcbiAgfSxcbiAgXG4gIG11bHRpcGx5IDogZnVuY3Rpb24oZSkge1xuICBcbiAgICB2YXIgbnVtID0gbmV3IEFycmF5KHRoaXMuZ2V0TGVuZ3RoKCkgKyBlLmdldExlbmd0aCgpIC0gMSk7XG4gIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nZXRMZW5ndGgoKTsgaSsrKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGUuZ2V0TGVuZ3RoKCk7IGorKykge1xuICAgICAgICBudW1baSArIGpdIF49IFFSTWF0aC5nZXhwKFFSTWF0aC5nbG9nKHRoaXMuZ2V0KGkpICkgKyBRUk1hdGguZ2xvZyhlLmdldChqKSApICk7XG4gICAgICB9XG4gICAgfVxuICBcbiAgICByZXR1cm4gbmV3IFFSUG9seW5vbWlhbChudW0sIDApO1xuICB9LFxuICBcbiAgbW9kIDogZnVuY3Rpb24oZSkge1xuICBcbiAgICBpZiAodGhpcy5nZXRMZW5ndGgoKSAtIGUuZ2V0TGVuZ3RoKCkgPCAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIFxuICAgIHZhciByYXRpbyA9IFFSTWF0aC5nbG9nKHRoaXMuZ2V0KDApICkgLSBRUk1hdGguZ2xvZyhlLmdldCgwKSApO1xuICBcbiAgICB2YXIgbnVtID0gbmV3IEFycmF5KHRoaXMuZ2V0TGVuZ3RoKCkgKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZ2V0TGVuZ3RoKCk7IGkrKykge1xuICAgICAgbnVtW2ldID0gdGhpcy5nZXQoaSk7XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZS5nZXRMZW5ndGgoKTsgaSsrKSB7XG4gICAgICBudW1baV0gXj0gUVJNYXRoLmdleHAoUVJNYXRoLmdsb2coZS5nZXQoaSkgKSArIHJhdGlvKTtcbiAgICB9XG4gIFxuICAgIC8vIHJlY3Vyc2l2ZSBjYWxsXG4gICAgcmV0dXJuIG5ldyBRUlBvbHlub21pYWwobnVtLCAwKS5tb2QoZSk7XG4gIH1cbn07XG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUlJTQmxvY2tcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIFFSUlNCbG9jayh0b3RhbENvdW50LCBkYXRhQ291bnQpIHtcbiAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgdGhpcy5kYXRhQ291bnQgID0gZGF0YUNvdW50O1xufVxuXG5RUlJTQmxvY2suUlNfQkxPQ0tfVEFCTEUgPSBbXG5cbiAgLy8gTFxuICAvLyBNXG4gIC8vIFFcbiAgLy8gSFxuXG4gIC8vIDFcbiAgWzEsIDI2LCAxOV0sXG4gIFsxLCAyNiwgMTZdLFxuICBbMSwgMjYsIDEzXSxcbiAgWzEsIDI2LCA5XSxcbiAgXG4gIC8vIDJcbiAgWzEsIDQ0LCAzNF0sXG4gIFsxLCA0NCwgMjhdLFxuICBbMSwgNDQsIDIyXSxcbiAgWzEsIDQ0LCAxNl0sXG5cbiAgLy8gM1xuICBbMSwgNzAsIDU1XSxcbiAgWzEsIDcwLCA0NF0sXG4gIFsyLCAzNSwgMTddLFxuICBbMiwgMzUsIDEzXSxcblxuICAvLyA0ICAgIFxuICBbMSwgMTAwLCA4MF0sXG4gIFsyLCA1MCwgMzJdLFxuICBbMiwgNTAsIDI0XSxcbiAgWzQsIDI1LCA5XSxcbiAgXG4gIC8vIDVcbiAgWzEsIDEzNCwgMTA4XSxcbiAgWzIsIDY3LCA0M10sXG4gIFsyLCAzMywgMTUsIDIsIDM0LCAxNl0sXG4gIFsyLCAzMywgMTEsIDIsIDM0LCAxMl0sXG4gIFxuICAvLyA2XG4gIFsyLCA4NiwgNjhdLFxuICBbNCwgNDMsIDI3XSxcbiAgWzQsIDQzLCAxOV0sXG4gIFs0LCA0MywgMTVdLFxuICBcbiAgLy8gNyAgICBcbiAgWzIsIDk4LCA3OF0sXG4gIFs0LCA0OSwgMzFdLFxuICBbMiwgMzIsIDE0LCA0LCAzMywgMTVdLFxuICBbNCwgMzksIDEzLCAxLCA0MCwgMTRdLFxuICBcbiAgLy8gOFxuICBbMiwgMTIxLCA5N10sXG4gIFsyLCA2MCwgMzgsIDIsIDYxLCAzOV0sXG4gIFs0LCA0MCwgMTgsIDIsIDQxLCAxOV0sXG4gIFs0LCA0MCwgMTQsIDIsIDQxLCAxNV0sXG4gIFxuICAvLyA5XG4gIFsyLCAxNDYsIDExNl0sXG4gIFszLCA1OCwgMzYsIDIsIDU5LCAzN10sXG4gIFs0LCAzNiwgMTYsIDQsIDM3LCAxN10sXG4gIFs0LCAzNiwgMTIsIDQsIDM3LCAxM10sXG4gIFxuICAvLyAxMCAgIFxuICBbMiwgODYsIDY4LCAyLCA4NywgNjldLFxuICBbNCwgNjksIDQzLCAxLCA3MCwgNDRdLFxuICBbNiwgNDMsIDE5LCAyLCA0NCwgMjBdLFxuICBbNiwgNDMsIDE1LCAyLCA0NCwgMTZdLFxuXG4gIC8vIDExXG4gIFs0LCAxMDEsIDgxXSxcbiAgWzEsIDgwLCA1MCwgNCwgODEsIDUxXSxcbiAgWzQsIDUwLCAyMiwgNCwgNTEsIDIzXSxcbiAgWzMsIDM2LCAxMiwgOCwgMzcsIDEzXSxcblxuICAvLyAxMlxuICBbMiwgMTE2LCA5MiwgMiwgMTE3LCA5M10sXG4gIFs2LCA1OCwgMzYsIDIsIDU5LCAzN10sXG4gIFs0LCA0NiwgMjAsIDYsIDQ3LCAyMV0sXG4gIFs3LCA0MiwgMTQsIDQsIDQzLCAxNV0sXG5cbiAgLy8gMTNcbiAgWzQsIDEzMywgMTA3XSxcbiAgWzgsIDU5LCAzNywgMSwgNjAsIDM4XSxcbiAgWzgsIDQ0LCAyMCwgNCwgNDUsIDIxXSxcbiAgWzEyLCAzMywgMTEsIDQsIDM0LCAxMl0sXG5cbiAgLy8gMTRcbiAgWzMsIDE0NSwgMTE1LCAxLCAxNDYsIDExNl0sXG4gIFs0LCA2NCwgNDAsIDUsIDY1LCA0MV0sXG4gIFsxMSwgMzYsIDE2LCA1LCAzNywgMTddLFxuICBbMTEsIDM2LCAxMiwgNSwgMzcsIDEzXSxcblxuICAvLyAxNVxuICBbNSwgMTA5LCA4NywgMSwgMTEwLCA4OF0sXG4gIFs1LCA2NSwgNDEsIDUsIDY2LCA0Ml0sXG4gIFs1LCA1NCwgMjQsIDcsIDU1LCAyNV0sXG4gIFsxMSwgMzYsIDEyXSxcblxuICAvLyAxNlxuICBbNSwgMTIyLCA5OCwgMSwgMTIzLCA5OV0sXG4gIFs3LCA3MywgNDUsIDMsIDc0LCA0Nl0sXG4gIFsxNSwgNDMsIDE5LCAyLCA0NCwgMjBdLFxuICBbMywgNDUsIDE1LCAxMywgNDYsIDE2XSxcblxuICAvLyAxN1xuICBbMSwgMTM1LCAxMDcsIDUsIDEzNiwgMTA4XSxcbiAgWzEwLCA3NCwgNDYsIDEsIDc1LCA0N10sXG4gIFsxLCA1MCwgMjIsIDE1LCA1MSwgMjNdLFxuICBbMiwgNDIsIDE0LCAxNywgNDMsIDE1XSxcblxuICAvLyAxOFxuICBbNSwgMTUwLCAxMjAsIDEsIDE1MSwgMTIxXSxcbiAgWzksIDY5LCA0MywgNCwgNzAsIDQ0XSxcbiAgWzE3LCA1MCwgMjIsIDEsIDUxLCAyM10sXG4gIFsyLCA0MiwgMTQsIDE5LCA0MywgMTVdLFxuXG4gIC8vIDE5XG4gIFszLCAxNDEsIDExMywgNCwgMTQyLCAxMTRdLFxuICBbMywgNzAsIDQ0LCAxMSwgNzEsIDQ1XSxcbiAgWzE3LCA0NywgMjEsIDQsIDQ4LCAyMl0sXG4gIFs5LCAzOSwgMTMsIDE2LCA0MCwgMTRdLFxuXG4gIC8vIDIwXG4gIFszLCAxMzUsIDEwNywgNSwgMTM2LCAxMDhdLFxuICBbMywgNjcsIDQxLCAxMywgNjgsIDQyXSxcbiAgWzE1LCA1NCwgMjQsIDUsIDU1LCAyNV0sXG4gIFsxNSwgNDMsIDE1LCAxMCwgNDQsIDE2XSxcblxuICAvLyAyMVxuICBbNCwgMTQ0LCAxMTYsIDQsIDE0NSwgMTE3XSxcbiAgWzE3LCA2OCwgNDJdLFxuICBbMTcsIDUwLCAyMiwgNiwgNTEsIDIzXSxcbiAgWzE5LCA0NiwgMTYsIDYsIDQ3LCAxN10sXG5cbiAgLy8gMjJcbiAgWzIsIDEzOSwgMTExLCA3LCAxNDAsIDExMl0sXG4gIFsxNywgNzQsIDQ2XSxcbiAgWzcsIDU0LCAyNCwgMTYsIDU1LCAyNV0sXG4gIFszNCwgMzcsIDEzXSxcblxuICAvLyAyM1xuICBbNCwgMTUxLCAxMjEsIDUsIDE1MiwgMTIyXSxcbiAgWzQsIDc1LCA0NywgMTQsIDc2LCA0OF0sXG4gIFsxMSwgNTQsIDI0LCAxNCwgNTUsIDI1XSxcbiAgWzE2LCA0NSwgMTUsIDE0LCA0NiwgMTZdLFxuXG4gIC8vIDI0XG4gIFs2LCAxNDcsIDExNywgNCwgMTQ4LCAxMThdLFxuICBbNiwgNzMsIDQ1LCAxNCwgNzQsIDQ2XSxcbiAgWzExLCA1NCwgMjQsIDE2LCA1NSwgMjVdLFxuICBbMzAsIDQ2LCAxNiwgMiwgNDcsIDE3XSxcblxuICAvLyAyNVxuICBbOCwgMTMyLCAxMDYsIDQsIDEzMywgMTA3XSxcbiAgWzgsIDc1LCA0NywgMTMsIDc2LCA0OF0sXG4gIFs3LCA1NCwgMjQsIDIyLCA1NSwgMjVdLFxuICBbMjIsIDQ1LCAxNSwgMTMsIDQ2LCAxNl0sXG5cbiAgLy8gMjZcbiAgWzEwLCAxNDIsIDExNCwgMiwgMTQzLCAxMTVdLFxuICBbMTksIDc0LCA0NiwgNCwgNzUsIDQ3XSxcbiAgWzI4LCA1MCwgMjIsIDYsIDUxLCAyM10sXG4gIFszMywgNDYsIDE2LCA0LCA0NywgMTddLFxuXG4gIC8vIDI3XG4gIFs4LCAxNTIsIDEyMiwgNCwgMTUzLCAxMjNdLFxuICBbMjIsIDczLCA0NSwgMywgNzQsIDQ2XSxcbiAgWzgsIDUzLCAyMywgMjYsIDU0LCAyNF0sXG4gIFsxMiwgNDUsIDE1LCAyOCwgNDYsIDE2XSxcblxuICAvLyAyOFxuICBbMywgMTQ3LCAxMTcsIDEwLCAxNDgsIDExOF0sXG4gIFszLCA3MywgNDUsIDIzLCA3NCwgNDZdLFxuICBbNCwgNTQsIDI0LCAzMSwgNTUsIDI1XSxcbiAgWzExLCA0NSwgMTUsIDMxLCA0NiwgMTZdLFxuXG4gIC8vIDI5XG4gIFs3LCAxNDYsIDExNiwgNywgMTQ3LCAxMTddLFxuICBbMjEsIDczLCA0NSwgNywgNzQsIDQ2XSxcbiAgWzEsIDUzLCAyMywgMzcsIDU0LCAyNF0sXG4gIFsxOSwgNDUsIDE1LCAyNiwgNDYsIDE2XSxcblxuICAvLyAzMFxuICBbNSwgMTQ1LCAxMTUsIDEwLCAxNDYsIDExNl0sXG4gIFsxOSwgNzUsIDQ3LCAxMCwgNzYsIDQ4XSxcbiAgWzE1LCA1NCwgMjQsIDI1LCA1NSwgMjVdLFxuICBbMjMsIDQ1LCAxNSwgMjUsIDQ2LCAxNl0sXG5cbiAgLy8gMzFcbiAgWzEzLCAxNDUsIDExNSwgMywgMTQ2LCAxMTZdLFxuICBbMiwgNzQsIDQ2LCAyOSwgNzUsIDQ3XSxcbiAgWzQyLCA1NCwgMjQsIDEsIDU1LCAyNV0sXG4gIFsyMywgNDUsIDE1LCAyOCwgNDYsIDE2XSxcblxuICAvLyAzMlxuICBbMTcsIDE0NSwgMTE1XSxcbiAgWzEwLCA3NCwgNDYsIDIzLCA3NSwgNDddLFxuICBbMTAsIDU0LCAyNCwgMzUsIDU1LCAyNV0sXG4gIFsxOSwgNDUsIDE1LCAzNSwgNDYsIDE2XSxcblxuICAvLyAzM1xuICBbMTcsIDE0NSwgMTE1LCAxLCAxNDYsIDExNl0sXG4gIFsxNCwgNzQsIDQ2LCAyMSwgNzUsIDQ3XSxcbiAgWzI5LCA1NCwgMjQsIDE5LCA1NSwgMjVdLFxuICBbMTEsIDQ1LCAxNSwgNDYsIDQ2LCAxNl0sXG5cbiAgLy8gMzRcbiAgWzEzLCAxNDUsIDExNSwgNiwgMTQ2LCAxMTZdLFxuICBbMTQsIDc0LCA0NiwgMjMsIDc1LCA0N10sXG4gIFs0NCwgNTQsIDI0LCA3LCA1NSwgMjVdLFxuICBbNTksIDQ2LCAxNiwgMSwgNDcsIDE3XSxcblxuICAvLyAzNVxuICBbMTIsIDE1MSwgMTIxLCA3LCAxNTIsIDEyMl0sXG4gIFsxMiwgNzUsIDQ3LCAyNiwgNzYsIDQ4XSxcbiAgWzM5LCA1NCwgMjQsIDE0LCA1NSwgMjVdLFxuICBbMjIsIDQ1LCAxNSwgNDEsIDQ2LCAxNl0sXG5cbiAgLy8gMzZcbiAgWzYsIDE1MSwgMTIxLCAxNCwgMTUyLCAxMjJdLFxuICBbNiwgNzUsIDQ3LCAzNCwgNzYsIDQ4XSxcbiAgWzQ2LCA1NCwgMjQsIDEwLCA1NSwgMjVdLFxuICBbMiwgNDUsIDE1LCA2NCwgNDYsIDE2XSxcblxuICAvLyAzN1xuICBbMTcsIDE1MiwgMTIyLCA0LCAxNTMsIDEyM10sXG4gIFsyOSwgNzQsIDQ2LCAxNCwgNzUsIDQ3XSxcbiAgWzQ5LCA1NCwgMjQsIDEwLCA1NSwgMjVdLFxuICBbMjQsIDQ1LCAxNSwgNDYsIDQ2LCAxNl0sXG5cbiAgLy8gMzhcbiAgWzQsIDE1MiwgMTIyLCAxOCwgMTUzLCAxMjNdLFxuICBbMTMsIDc0LCA0NiwgMzIsIDc1LCA0N10sXG4gIFs0OCwgNTQsIDI0LCAxNCwgNTUsIDI1XSxcbiAgWzQyLCA0NSwgMTUsIDMyLCA0NiwgMTZdLFxuXG4gIC8vIDM5XG4gIFsyMCwgMTQ3LCAxMTcsIDQsIDE0OCwgMTE4XSxcbiAgWzQwLCA3NSwgNDcsIDcsIDc2LCA0OF0sXG4gIFs0MywgNTQsIDI0LCAyMiwgNTUsIDI1XSxcbiAgWzEwLCA0NSwgMTUsIDY3LCA0NiwgMTZdLFxuXG4gIC8vIDQwXG4gIFsxOSwgMTQ4LCAxMTgsIDYsIDE0OSwgMTE5XSxcbiAgWzE4LCA3NSwgNDcsIDMxLCA3NiwgNDhdLFxuICBbMzQsIDU0LCAyNCwgMzQsIDU1LCAyNV0sXG4gIFsyMCwgNDUsIDE1LCA2MSwgNDYsIDE2XVxuXTtcblxuUVJSU0Jsb2NrLmdldFJTQmxvY2tzID0gZnVuY3Rpb24odHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpIHtcbiAgXG4gIHZhciByc0Jsb2NrID0gUVJSU0Jsb2NrLmdldFJzQmxvY2tUYWJsZSh0eXBlTnVtYmVyLCBlcnJvckNvcnJlY3RMZXZlbCk7XG4gIFxuICBpZiAocnNCbG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgcnMgYmxvY2sgQCB0eXBlTnVtYmVyOlwiICsgdHlwZU51bWJlciArIFwiL2Vycm9yQ29ycmVjdExldmVsOlwiICsgZXJyb3JDb3JyZWN0TGV2ZWwpO1xuICB9XG5cbiAgdmFyIGxlbmd0aCA9IHJzQmxvY2subGVuZ3RoIC8gMztcbiAgXG4gIHZhciBsaXN0ID0gbmV3IEFycmF5KCk7XG4gIFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cbiAgICB2YXIgY291bnQgPSByc0Jsb2NrW2kgKiAzICsgMF07XG4gICAgdmFyIHRvdGFsQ291bnQgPSByc0Jsb2NrW2kgKiAzICsgMV07XG4gICAgdmFyIGRhdGFDb3VudCAgPSByc0Jsb2NrW2kgKiAzICsgMl07XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvdW50OyBqKyspIHtcbiAgICAgIGxpc3QucHVzaChuZXcgUVJSU0Jsb2NrKHRvdGFsQ291bnQsIGRhdGFDb3VudCkgKTsgXG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4gbGlzdDtcbn1cblxuUVJSU0Jsb2NrLmdldFJzQmxvY2tUYWJsZSA9IGZ1bmN0aW9uKHR5cGVOdW1iZXIsIGVycm9yQ29ycmVjdExldmVsKSB7XG5cbiAgc3dpdGNoKGVycm9yQ29ycmVjdExldmVsKSB7XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5MIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgMF07XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5NIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgMV07XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5RIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgMl07XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5IIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgM107XG4gIGRlZmF1bHQgOlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSQml0QnVmZmVyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBRUkJpdEJ1ZmZlcigpIHtcbiAgdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkoKTtcbiAgdGhpcy5sZW5ndGggPSAwO1xufVxuXG5RUkJpdEJ1ZmZlci5wcm90b3R5cGUgPSB7XG5cbiAgZ2V0IDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB2YXIgYnVmSW5kZXggPSBNYXRoLmZsb29yKGluZGV4IC8gOCk7XG4gICAgcmV0dXJuICggKHRoaXMuYnVmZmVyW2J1ZkluZGV4XSA+Pj4gKDcgLSBpbmRleCAlIDgpICkgJiAxKSA9PSAxO1xuICB9LFxuICBcbiAgcHV0IDogZnVuY3Rpb24obnVtLCBsZW5ndGgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnB1dEJpdCggKCAobnVtID4+PiAobGVuZ3RoIC0gaSAtIDEpICkgJiAxKSA9PSAxKTtcbiAgICB9XG4gIH0sXG4gIFxuICBnZXRMZW5ndGhJbkJpdHMgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gIH0sXG4gIFxuICBwdXRCaXQgOiBmdW5jdGlvbihiaXQpIHtcbiAgXG4gICAgdmFyIGJ1ZkluZGV4ID0gTWF0aC5mbG9vcih0aGlzLmxlbmd0aCAvIDgpO1xuICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPD0gYnVmSW5kZXgpIHtcbiAgICAgIHRoaXMuYnVmZmVyLnB1c2goMCk7XG4gICAgfVxuICBcbiAgICBpZiAoYml0KSB7XG4gICAgICB0aGlzLmJ1ZmZlcltidWZJbmRleF0gfD0gKDB4ODAgPj4+ICh0aGlzLmxlbmd0aCAlIDgpICk7XG4gICAgfVxuICBcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG59O1xuXG5leHBvcnQge1xuICBRUkNvZGUsXG4gIFFSRXJyb3JDb3JyZWN0TGV2ZWxcbn1cbiIsImltcG9ydCB7IFFSQ29kZSwgUVJFcnJvckNvcnJlY3RMZXZlbCB9IGZyb20gJy4vcXJjb2RlJ1xuXG5mdW5jdGlvbiBkcmF3UXJjb2RlIChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHtcbiAgICB3aWR0aDogMjU2LFxuICAgIGhlaWdodDogMjU2LFxuICAgIHR5cGVOdW1iZXI6IC0xLFxuICAgIGNvcnJlY3RMZXZlbDogUVJFcnJvckNvcnJlY3RMZXZlbC5ILFxuICAgIGJhY2tncm91bmQ6ICcjZmZmZmZmJyxcbiAgICBmb3JlZ3JvdW5kOiAnIzAwMDAwMCdcbiAgfSwgb3B0aW9ucylcblxuICBpZiAoIW9wdGlvbnMuY2FudmFzSWQpIHtcbiAgICBjb25zb2xlLndhcm4oJ3BsZWFzZSB5b3Ugc2V0IGNhbnZhc0lkIScpXG4gICAgcmV0dXJuXG4gIH1cblxuICBjcmVhdGVDYW52YXMoKVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNhbnZhcyAoKSB7XG4gICAgLy8gY3JlYXRlIHRoZSBxcmNvZGUgaXRzZWxmXG4gICAgdmFyIHFyY29kZSA9IG5ldyBRUkNvZGUob3B0aW9ucy50eXBlTnVtYmVyLCBvcHRpb25zLmNvcnJlY3RMZXZlbClcbiAgICBxcmNvZGUuYWRkRGF0YShvcHRpb25zLnRleHQpXG4gICAgcXJjb2RlLm1ha2UoKVxuXG4gICAgLy8gZ2V0IGNhbnZhcyBjb250ZXh0XG4gICAgdmFyIGN0eCA9IHd4LmNyZWF0ZUNhbnZhc0NvbnRleHQgJiYgd3guY3JlYXRlQ2FudmFzQ29udGV4dChvcHRpb25zLmNhbnZhc0lkKVxuXG4gICAgY29uc29sZS5sb2coJ2N0eCcsIGN0eClcblxuICAgIC8vIGNvbXB1dGUgdGlsZVcvdGlsZUggYmFzZWQgb24gb3B0aW9ucy53aWR0aC9vcHRpb25zLmhlaWdodFxuICAgIHZhciB0aWxlVyA9IG9wdGlvbnMud2lkdGggLyBxcmNvZGUuZ2V0TW9kdWxlQ291bnQoKVxuICAgIHZhciB0aWxlSCA9IG9wdGlvbnMuaGVpZ2h0IC8gcXJjb2RlLmdldE1vZHVsZUNvdW50KClcblxuICAgIC8vIGRyYXcgaW4gdGhlIGNhbnZhc1xuICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IHFyY29kZS5nZXRNb2R1bGVDb3VudCgpOyByb3crKykge1xuICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgcXJjb2RlLmdldE1vZHVsZUNvdW50KCk7IGNvbCsrKSB7XG4gICAgICAgIHZhciBzdHlsZSA9IHFyY29kZS5pc0Rhcmsocm93LCBjb2wpID8gb3B0aW9ucy5mb3JlZ3JvdW5kIDogb3B0aW9ucy5iYWNrZ3JvdW5kXG4gICAgICAgIGN0eC5zZXRGaWxsU3R5bGUoc3R5bGUpXG4gICAgICAgIHZhciB3ID0gKE1hdGguY2VpbCgoY29sICsgMSkgKiB0aWxlVykgLSBNYXRoLmZsb29yKGNvbCAqIHRpbGVXKSlcbiAgICAgICAgdmFyIGggPSAoTWF0aC5jZWlsKChyb3cgKyAxKSAqIHRpbGVXKSAtIE1hdGguZmxvb3Iocm93ICogdGlsZVcpKVxuICAgICAgICBjdHguZmlsbFJlY3QoTWF0aC5yb3VuZChjb2wgKiB0aWxlVyksIE1hdGgucm91bmQocm93ICogdGlsZUgpLCB3LCBoKVxuICAgICAgfVxuICAgIH1cbiAgICBjdHguZHJhdygpXG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgZHJhd1FyY29kZVxuIl0sIm5hbWVzIjpbIlFSOGJpdEJ5dGUiLCJkYXRhIiwibW9kZSIsIlFSTW9kZSIsIk1PREVfOEJJVF9CWVRFIiwicHJvdG90eXBlIiwiYnVmZmVyIiwibGVuZ3RoIiwiaSIsInB1dCIsImNoYXJDb2RlQXQiLCJRUkNvZGUiLCJ0eXBlTnVtYmVyIiwiZXJyb3JDb3JyZWN0TGV2ZWwiLCJtb2R1bGVzIiwibW9kdWxlQ291bnQiLCJkYXRhQ2FjaGUiLCJkYXRhTGlzdCIsIkFycmF5IiwibmV3RGF0YSIsInB1c2giLCJyb3ciLCJjb2wiLCJFcnJvciIsInJzQmxvY2tzIiwiUVJSU0Jsb2NrIiwiZ2V0UlNCbG9ja3MiLCJRUkJpdEJ1ZmZlciIsInRvdGFsRGF0YUNvdW50IiwiZGF0YUNvdW50IiwiZ2V0TGVuZ3RoIiwiUVJVdGlsIiwiZ2V0TGVuZ3RoSW5CaXRzIiwid3JpdGUiLCJtYWtlSW1wbCIsImdldEJlc3RNYXNrUGF0dGVybiIsInRlc3QiLCJtYXNrUGF0dGVybiIsInNldHVwUG9zaXRpb25Qcm9iZVBhdHRlcm4iLCJzZXR1cFBvc2l0aW9uQWRqdXN0UGF0dGVybiIsInNldHVwVGltaW5nUGF0dGVybiIsInNldHVwVHlwZUluZm8iLCJzZXR1cFR5cGVOdW1iZXIiLCJjcmVhdGVEYXRhIiwibWFwRGF0YSIsInIiLCJjIiwibWluTG9zdFBvaW50IiwicGF0dGVybiIsImxvc3RQb2ludCIsImdldExvc3RQb2ludCIsInRhcmdldF9tYyIsImluc3RhbmNlX25hbWUiLCJkZXB0aCIsInFyX21jIiwiY3JlYXRlRW1wdHlNb3ZpZUNsaXAiLCJjcyIsIm1ha2UiLCJ5IiwieCIsImRhcmsiLCJiZWdpbkZpbGwiLCJtb3ZlVG8iLCJsaW5lVG8iLCJlbmRGaWxsIiwicG9zIiwiZ2V0UGF0dGVyblBvc2l0aW9uIiwiaiIsImJpdHMiLCJnZXRCQ0hUeXBlTnVtYmVyIiwibW9kIiwiTWF0aCIsImZsb29yIiwiZ2V0QkNIVHlwZUluZm8iLCJpbmMiLCJiaXRJbmRleCIsImJ5dGVJbmRleCIsIm1hc2siLCJnZXRNYXNrIiwiUEFEMCIsIlBBRDEiLCJwdXRCaXQiLCJjcmVhdGVCeXRlcyIsIm9mZnNldCIsIm1heERjQ291bnQiLCJtYXhFY0NvdW50IiwiZGNkYXRhIiwiZWNkYXRhIiwiZGNDb3VudCIsImVjQ291bnQiLCJ0b3RhbENvdW50IiwibWF4IiwicnNQb2x5IiwiZ2V0RXJyb3JDb3JyZWN0UG9seW5vbWlhbCIsInJhd1BvbHkiLCJRUlBvbHlub21pYWwiLCJtb2RQb2x5IiwibW9kSW5kZXgiLCJnZXQiLCJ0b3RhbENvZGVDb3VudCIsImluZGV4IiwiUVJFcnJvckNvcnJlY3RMZXZlbCIsIlFSTWFza1BhdHRlcm4iLCJkIiwiZ2V0QkNIRGlnaXQiLCJHMTUiLCJHMTVfTUFTSyIsIkcxOCIsImRpZ2l0IiwiUEFUVEVSTl9QT1NJVElPTl9UQUJMRSIsIlBBVFRFUk4wMDAiLCJQQVRURVJOMDAxIiwiUEFUVEVSTjAxMCIsIlBBVFRFUk4wMTEiLCJQQVRURVJOMTAwIiwiUEFUVEVSTjEwMSIsIlBBVFRFUk4xMTAiLCJQQVRURVJOMTExIiwiZXJyb3JDb3JyZWN0TGVuZ3RoIiwiYSIsIm11bHRpcGx5IiwiUVJNYXRoIiwiZ2V4cCIsInR5cGUiLCJNT0RFX05VTUJFUiIsIk1PREVfQUxQSEFfTlVNIiwiTU9ERV9LQU5KSSIsInFyQ29kZSIsImdldE1vZHVsZUNvdW50Iiwic2FtZUNvdW50IiwiaXNEYXJrIiwiY291bnQiLCJkYXJrQ291bnQiLCJyYXRpbyIsImFicyIsIm4iLCJMT0dfVEFCTEUiLCJFWFBfVEFCTEUiLCJudW0iLCJzaGlmdCIsInVuZGVmaW5lZCIsImUiLCJnbG9nIiwiUlNfQkxPQ0tfVEFCTEUiLCJyc0Jsb2NrIiwiZ2V0UnNCbG9ja1RhYmxlIiwibGlzdCIsIkwiLCJNIiwiUSIsIkgiLCJidWZJbmRleCIsImJpdCIsImRyYXdRcmNvZGUiLCJvcHRpb25zIiwiT2JqZWN0IiwiYXNzaWduIiwiY2FudmFzSWQiLCJ3YXJuIiwiY3JlYXRlQ2FudmFzIiwicXJjb2RlIiwiY29ycmVjdExldmVsIiwiYWRkRGF0YSIsInRleHQiLCJjdHgiLCJ3eCIsImNyZWF0ZUNhbnZhc0NvbnRleHQiLCJsb2ciLCJ0aWxlVyIsIndpZHRoIiwidGlsZUgiLCJoZWlnaHQiLCJzdHlsZSIsImZvcmVncm91bmQiLCJiYWNrZ3JvdW5kIiwic2V0RmlsbFN0eWxlIiwidyIsImNlaWwiLCJoIiwiZmlsbFJlY3QiLCJyb3VuZCIsImRyYXciXSwibWFwcGluZ3MiOiI7Ozs7Ozs7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFvQkEsU0FBU0EsVUFBVCxDQUFvQkMsSUFBcEIsRUFBMEI7T0FDbkJDLElBQUwsR0FBWUMsT0FBT0MsY0FBbkI7T0FDS0gsSUFBTCxHQUFZQSxJQUFaOzs7QUFH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QyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLENBbkJ1QixFQW9CdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLENBcEJ1QixFQXFCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEVBQWhCLENBckJ1QixFQXNCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEVBQWhCLENBdEJ1QixFQXVCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLENBdkJ1QixFQXdCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLENBeEJ1QixFQXlCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLENBekJ1QixFQTBCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLENBMUJ1QixFQTJCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLENBM0J1QixFQTRCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEVBQWhCLEVBQW9CLEdBQXBCLENBNUJ1QixFQTZCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLEVBQXFCLEdBQXJCLENBN0J1QixFQThCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLEVBQXFCLEdBQXJCLENBOUJ1QixFQStCdkIsQ0FBQyxDQUFELEVBQUksRUFBSixFQUFRLEVBQVIsRUFBWSxFQUFaLEVBQWdCLEdBQWhCLEVBQXFCLEdBQXJCLENBL0J1QixFQWdDdkIsQ0FBQyxDQUFELEVBQUksRUFBSixF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
