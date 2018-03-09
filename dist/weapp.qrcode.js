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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2VhcHAucXJjb2RlLmpzIiwic291cmNlcyI6WyIuLi9zcmMvcXJjb2RlLmpzIiwiLi4vc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUkNvZGUgZm9yIEphdmFTY3JpcHRcbi8vXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgS2F6dWhpa28gQXJhc2Vcbi8vXG4vLyBVUkw6IGh0dHA6Ly93d3cuZC1wcm9qZWN0LmNvbS9cbi8vXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2U6XG4vLyAgIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4vL1xuLy8gVGhlIHdvcmQgXCJRUiBDb2RlXCIgaXMgcmVnaXN0ZXJlZCB0cmFkZW1hcmsgb2YgXG4vLyBERU5TTyBXQVZFIElOQ09SUE9SQVRFRFxuLy8gICBodHRwOi8vd3d3LmRlbnNvLXdhdmUuY29tL3FyY29kZS9mYXFwYXRlbnQtZS5odG1sXG4vL1xuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSOGJpdEJ5dGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIFFSOGJpdEJ5dGUoZGF0YSkge1xuICB0aGlzLm1vZGUgPSBRUk1vZGUuTU9ERV84QklUX0JZVEU7XG4gIHRoaXMuZGF0YSA9IGRhdGE7XG59XG5cblFSOGJpdEJ5dGUucHJvdG90eXBlID0ge1xuXG4gIGdldExlbmd0aCA6IGZ1bmN0aW9uKGJ1ZmZlcikge1xuICAgIHJldHVybiB0aGlzLmRhdGEubGVuZ3RoO1xuICB9LFxuICBcbiAgd3JpdGUgOiBmdW5jdGlvbihidWZmZXIpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZGF0YS5sZW5ndGg7IGkrKykge1xuICAgICAgLy8gbm90IEpJUyAuLi5cbiAgICAgIGJ1ZmZlci5wdXQodGhpcy5kYXRhLmNoYXJDb2RlQXQoaSksIDgpO1xuICAgIH1cbiAgfVxufTtcblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSQ29kZVxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZnVuY3Rpb24gUVJDb2RlKHR5cGVOdW1iZXIsIGVycm9yQ29ycmVjdExldmVsKSB7XG4gIHRoaXMudHlwZU51bWJlciA9IHR5cGVOdW1iZXI7XG4gIHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwgPSBlcnJvckNvcnJlY3RMZXZlbDtcbiAgdGhpcy5tb2R1bGVzID0gbnVsbDtcbiAgdGhpcy5tb2R1bGVDb3VudCA9IDA7XG4gIHRoaXMuZGF0YUNhY2hlID0gbnVsbDtcbiAgdGhpcy5kYXRhTGlzdCA9IG5ldyBBcnJheSgpO1xufVxuXG5RUkNvZGUucHJvdG90eXBlID0ge1xuICBcbiAgYWRkRGF0YSA6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgbmV3RGF0YSA9IG5ldyBRUjhiaXRCeXRlKGRhdGEpO1xuICAgIHRoaXMuZGF0YUxpc3QucHVzaChuZXdEYXRhKTtcbiAgICB0aGlzLmRhdGFDYWNoZSA9IG51bGw7XG4gIH0sXG4gIFxuICBpc0RhcmsgOiBmdW5jdGlvbihyb3csIGNvbCkge1xuICAgIGlmIChyb3cgPCAwIHx8IHRoaXMubW9kdWxlQ291bnQgPD0gcm93IHx8IGNvbCA8IDAgfHwgdGhpcy5tb2R1bGVDb3VudCA8PSBjb2wpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihyb3cgKyBcIixcIiArIGNvbCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1vZHVsZXNbcm93XVtjb2xdO1xuICB9LFxuXG4gIGdldE1vZHVsZUNvdW50IDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubW9kdWxlQ291bnQ7XG4gIH0sXG4gIFxuICBtYWtlIDogZnVuY3Rpb24oKSB7XG4gICAgLy8gQ2FsY3VsYXRlIGF1dG9tYXRpY2FsbHkgdHlwZU51bWJlciBpZiBwcm92aWRlZCBpcyA8IDFcbiAgICBpZiAodGhpcy50eXBlTnVtYmVyIDwgMSApe1xuICAgICAgdmFyIHR5cGVOdW1iZXIgPSAxO1xuICAgICAgZm9yICh0eXBlTnVtYmVyID0gMTsgdHlwZU51bWJlciA8IDQwOyB0eXBlTnVtYmVyKyspIHtcbiAgICAgICAgdmFyIHJzQmxvY2tzID0gUVJSU0Jsb2NrLmdldFJTQmxvY2tzKHR5cGVOdW1iZXIsIHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwpO1xuXG4gICAgICAgIHZhciBidWZmZXIgPSBuZXcgUVJCaXRCdWZmZXIoKTtcbiAgICAgICAgdmFyIHRvdGFsRGF0YUNvdW50ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByc0Jsb2Nrcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHRvdGFsRGF0YUNvdW50ICs9IHJzQmxvY2tzW2ldLmRhdGFDb3VudDtcbiAgICAgICAgfVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5kYXRhTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5kYXRhTGlzdFtpXTtcbiAgICAgICAgICBidWZmZXIucHV0KGRhdGEubW9kZSwgNCk7XG4gICAgICAgICAgYnVmZmVyLnB1dChkYXRhLmdldExlbmd0aCgpLCBRUlV0aWwuZ2V0TGVuZ3RoSW5CaXRzKGRhdGEubW9kZSwgdHlwZU51bWJlcikgKTtcbiAgICAgICAgICBkYXRhLndyaXRlKGJ1ZmZlcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSA8PSB0b3RhbERhdGFDb3VudCAqIDgpXG4gICAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgICB0aGlzLnR5cGVOdW1iZXIgPSB0eXBlTnVtYmVyO1xuICAgIH1cbiAgICB0aGlzLm1ha2VJbXBsKGZhbHNlLCB0aGlzLmdldEJlc3RNYXNrUGF0dGVybigpICk7XG4gIH0sXG4gIFxuICBtYWtlSW1wbCA6IGZ1bmN0aW9uKHRlc3QsIG1hc2tQYXR0ZXJuKSB7XG4gICAgXG4gICAgdGhpcy5tb2R1bGVDb3VudCA9IHRoaXMudHlwZU51bWJlciAqIDQgKyAxNztcbiAgICB0aGlzLm1vZHVsZXMgPSBuZXcgQXJyYXkodGhpcy5tb2R1bGVDb3VudCk7XG4gICAgXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgdGhpcy5tb2R1bGVDb3VudDsgcm93KyspIHtcbiAgICAgIFxuICAgICAgdGhpcy5tb2R1bGVzW3Jvd10gPSBuZXcgQXJyYXkodGhpcy5tb2R1bGVDb3VudCk7XG4gICAgICBcbiAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IHRoaXMubW9kdWxlQ291bnQ7IGNvbCsrKSB7XG4gICAgICAgIHRoaXMubW9kdWxlc1tyb3ddW2NvbF0gPSBudWxsOy8vKGNvbCArIHJvdykgJSAzO1xuICAgICAgfVxuICAgIH1cbiAgXG4gICAgdGhpcy5zZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKDAsIDApO1xuICAgIHRoaXMuc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybih0aGlzLm1vZHVsZUNvdW50IC0gNywgMCk7XG4gICAgdGhpcy5zZXR1cFBvc2l0aW9uUHJvYmVQYXR0ZXJuKDAsIHRoaXMubW9kdWxlQ291bnQgLSA3KTtcbiAgICB0aGlzLnNldHVwUG9zaXRpb25BZGp1c3RQYXR0ZXJuKCk7XG4gICAgdGhpcy5zZXR1cFRpbWluZ1BhdHRlcm4oKTtcbiAgICB0aGlzLnNldHVwVHlwZUluZm8odGVzdCwgbWFza1BhdHRlcm4pO1xuICAgIFxuICAgIGlmICh0aGlzLnR5cGVOdW1iZXIgPj0gNykge1xuICAgICAgdGhpcy5zZXR1cFR5cGVOdW1iZXIodGVzdCk7XG4gICAgfVxuICBcbiAgICBpZiAodGhpcy5kYXRhQ2FjaGUgPT0gbnVsbCkge1xuICAgICAgdGhpcy5kYXRhQ2FjaGUgPSBRUkNvZGUuY3JlYXRlRGF0YSh0aGlzLnR5cGVOdW1iZXIsIHRoaXMuZXJyb3JDb3JyZWN0TGV2ZWwsIHRoaXMuZGF0YUxpc3QpO1xuICAgIH1cbiAgXG4gICAgdGhpcy5tYXBEYXRhKHRoaXMuZGF0YUNhY2hlLCBtYXNrUGF0dGVybik7XG4gIH0sXG5cbiAgc2V0dXBQb3NpdGlvblByb2JlUGF0dGVybiA6IGZ1bmN0aW9uKHJvdywgY29sKSAge1xuICAgIFxuICAgIGZvciAodmFyIHIgPSAtMTsgciA8PSA3OyByKyspIHtcbiAgICAgIFxuICAgICAgaWYgKHJvdyArIHIgPD0gLTEgfHwgdGhpcy5tb2R1bGVDb3VudCA8PSByb3cgKyByKSBjb250aW51ZTtcbiAgICAgIFxuICAgICAgZm9yICh2YXIgYyA9IC0xOyBjIDw9IDc7IGMrKykge1xuICAgICAgICBcbiAgICAgICAgaWYgKGNvbCArIGMgPD0gLTEgfHwgdGhpcy5tb2R1bGVDb3VudCA8PSBjb2wgKyBjKSBjb250aW51ZTtcbiAgICAgICAgXG4gICAgICAgIGlmICggKDAgPD0gciAmJiByIDw9IDYgJiYgKGMgPT0gMCB8fCBjID09IDYpIClcbiAgICAgICAgICAgIHx8ICgwIDw9IGMgJiYgYyA8PSA2ICYmIChyID09IDAgfHwgciA9PSA2KSApXG4gICAgICAgICAgICB8fCAoMiA8PSByICYmIHIgPD0gNCAmJiAyIDw9IGMgJiYgYyA8PSA0KSApIHtcbiAgICAgICAgICB0aGlzLm1vZHVsZXNbcm93ICsgcl1bY29sICsgY10gPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMubW9kdWxlc1tyb3cgKyByXVtjb2wgKyBjXSA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9ICAgXG4gICAgfSAgIFxuICB9LFxuICBcbiAgZ2V0QmVzdE1hc2tQYXR0ZXJuIDogZnVuY3Rpb24oKSB7XG4gIFxuICAgIHZhciBtaW5Mb3N0UG9pbnQgPSAwO1xuICAgIHZhciBwYXR0ZXJuID0gMDtcbiAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgIFxuICAgICAgdGhpcy5tYWtlSW1wbCh0cnVlLCBpKTtcbiAgXG4gICAgICB2YXIgbG9zdFBvaW50ID0gUVJVdGlsLmdldExvc3RQb2ludCh0aGlzKTtcbiAgXG4gICAgICBpZiAoaSA9PSAwIHx8IG1pbkxvc3RQb2ludCA+ICBsb3N0UG9pbnQpIHtcbiAgICAgICAgbWluTG9zdFBvaW50ID0gbG9zdFBvaW50O1xuICAgICAgICBwYXR0ZXJuID0gaTtcbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIHJldHVybiBwYXR0ZXJuO1xuICB9LFxuICBcbiAgY3JlYXRlTW92aWVDbGlwIDogZnVuY3Rpb24odGFyZ2V0X21jLCBpbnN0YW5jZV9uYW1lLCBkZXB0aCkge1xuICBcbiAgICB2YXIgcXJfbWMgPSB0YXJnZXRfbWMuY3JlYXRlRW1wdHlNb3ZpZUNsaXAoaW5zdGFuY2VfbmFtZSwgZGVwdGgpO1xuICAgIHZhciBjcyA9IDE7XG4gIFxuICAgIHRoaXMubWFrZSgpO1xuXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgdGhpcy5tb2R1bGVzLmxlbmd0aDsgcm93KyspIHtcbiAgICAgIFxuICAgICAgdmFyIHkgPSByb3cgKiBjcztcbiAgICAgIFxuICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgdGhpcy5tb2R1bGVzW3Jvd10ubGVuZ3RoOyBjb2wrKykge1xuICBcbiAgICAgICAgdmFyIHggPSBjb2wgKiBjcztcbiAgICAgICAgdmFyIGRhcmsgPSB0aGlzLm1vZHVsZXNbcm93XVtjb2xdO1xuICAgICAgXG4gICAgICAgIGlmIChkYXJrKSB7XG4gICAgICAgICAgcXJfbWMuYmVnaW5GaWxsKDAsIDEwMCk7XG4gICAgICAgICAgcXJfbWMubW92ZVRvKHgsIHkpO1xuICAgICAgICAgIHFyX21jLmxpbmVUbyh4ICsgY3MsIHkpO1xuICAgICAgICAgIHFyX21jLmxpbmVUbyh4ICsgY3MsIHkgKyBjcyk7XG4gICAgICAgICAgcXJfbWMubGluZVRvKHgsIHkgKyBjcyk7XG4gICAgICAgICAgcXJfbWMuZW5kRmlsbCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIHJldHVybiBxcl9tYztcbiAgfSxcblxuICBzZXR1cFRpbWluZ1BhdHRlcm4gOiBmdW5jdGlvbigpIHtcbiAgICBcbiAgICBmb3IgKHZhciByID0gODsgciA8IHRoaXMubW9kdWxlQ291bnQgLSA4OyByKyspIHtcbiAgICAgIGlmICh0aGlzLm1vZHVsZXNbcl1bNl0gIT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMubW9kdWxlc1tyXVs2XSA9IChyICUgMiA9PSAwKTtcbiAgICB9XG4gIFxuICAgIGZvciAodmFyIGMgPSA4OyBjIDwgdGhpcy5tb2R1bGVDb3VudCAtIDg7IGMrKykge1xuICAgICAgaWYgKHRoaXMubW9kdWxlc1s2XVtjXSAhPSBudWxsKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgdGhpcy5tb2R1bGVzWzZdW2NdID0gKGMgJSAyID09IDApO1xuICAgIH1cbiAgfSxcbiAgXG4gIHNldHVwUG9zaXRpb25BZGp1c3RQYXR0ZXJuIDogZnVuY3Rpb24oKSB7XG4gIFxuICAgIHZhciBwb3MgPSBRUlV0aWwuZ2V0UGF0dGVyblBvc2l0aW9uKHRoaXMudHlwZU51bWJlcik7XG4gICAgXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwb3MubGVuZ3RoOyBpKyspIHtcbiAgICBcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgcG9zLmxlbmd0aDsgaisrKSB7XG4gICAgICBcbiAgICAgICAgdmFyIHJvdyA9IHBvc1tpXTtcbiAgICAgICAgdmFyIGNvbCA9IHBvc1tqXTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0aGlzLm1vZHVsZXNbcm93XVtjb2xdICE9IG51bGwpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yICh2YXIgciA9IC0yOyByIDw9IDI7IHIrKykge1xuICAgICAgICBcbiAgICAgICAgICBmb3IgKHZhciBjID0gLTI7IGMgPD0gMjsgYysrKSB7XG4gICAgICAgICAgXG4gICAgICAgICAgICBpZiAociA9PSAtMiB8fCByID09IDIgfHwgYyA9PSAtMiB8fCBjID09IDIgXG4gICAgICAgICAgICAgICAgfHwgKHIgPT0gMCAmJiBjID09IDApICkge1xuICAgICAgICAgICAgICB0aGlzLm1vZHVsZXNbcm93ICsgcl1bY29sICsgY10gPSB0cnVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdGhpcy5tb2R1bGVzW3JvdyArIHJdW2NvbCArIGNdID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBcbiAgc2V0dXBUeXBlTnVtYmVyIDogZnVuY3Rpb24odGVzdCkge1xuICBcbiAgICB2YXIgYml0cyA9IFFSVXRpbC5nZXRCQ0hUeXBlTnVtYmVyKHRoaXMudHlwZU51bWJlcik7XG4gIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTg7IGkrKykge1xuICAgICAgdmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG4gICAgICB0aGlzLm1vZHVsZXNbTWF0aC5mbG9vcihpIC8gMyldW2kgJSAzICsgdGhpcy5tb2R1bGVDb3VudCAtIDggLSAzXSA9IG1vZDtcbiAgICB9XG4gIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTg7IGkrKykge1xuICAgICAgdmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG4gICAgICB0aGlzLm1vZHVsZXNbaSAlIDMgKyB0aGlzLm1vZHVsZUNvdW50IC0gOCAtIDNdW01hdGguZmxvb3IoaSAvIDMpXSA9IG1vZDtcbiAgICB9XG4gIH0sXG4gIFxuICBzZXR1cFR5cGVJbmZvIDogZnVuY3Rpb24odGVzdCwgbWFza1BhdHRlcm4pIHtcbiAgXG4gICAgdmFyIGRhdGEgPSAodGhpcy5lcnJvckNvcnJlY3RMZXZlbCA8PCAzKSB8IG1hc2tQYXR0ZXJuO1xuICAgIHZhciBiaXRzID0gUVJVdGlsLmdldEJDSFR5cGVJbmZvKGRhdGEpO1xuICBcbiAgICAvLyB2ZXJ0aWNhbCAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMTU7IGkrKykge1xuICBcbiAgICAgIHZhciBtb2QgPSAoIXRlc3QgJiYgKCAoYml0cyA+PiBpKSAmIDEpID09IDEpO1xuICBcbiAgICAgIGlmIChpIDwgNikge1xuICAgICAgICB0aGlzLm1vZHVsZXNbaV1bOF0gPSBtb2Q7XG4gICAgICB9IGVsc2UgaWYgKGkgPCA4KSB7XG4gICAgICAgIHRoaXMubW9kdWxlc1tpICsgMV1bOF0gPSBtb2Q7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLm1vZHVsZXNbdGhpcy5tb2R1bGVDb3VudCAtIDE1ICsgaV1bOF0gPSBtb2Q7XG4gICAgICB9XG4gICAgfVxuICBcbiAgICAvLyBob3Jpem9udGFsXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNTsgaSsrKSB7XG4gIFxuICAgICAgdmFyIG1vZCA9ICghdGVzdCAmJiAoIChiaXRzID4+IGkpICYgMSkgPT0gMSk7XG4gICAgICBcbiAgICAgIGlmIChpIDwgOCkge1xuICAgICAgICB0aGlzLm1vZHVsZXNbOF1bdGhpcy5tb2R1bGVDb3VudCAtIGkgLSAxXSA9IG1vZDtcbiAgICAgIH0gZWxzZSBpZiAoaSA8IDkpIHtcbiAgICAgICAgdGhpcy5tb2R1bGVzWzhdWzE1IC0gaSAtIDEgKyAxXSA9IG1vZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubW9kdWxlc1s4XVsxNSAtIGkgLSAxXSA9IG1vZDtcbiAgICAgIH1cbiAgICB9XG4gIFxuICAgIC8vIGZpeGVkIG1vZHVsZVxuICAgIHRoaXMubW9kdWxlc1t0aGlzLm1vZHVsZUNvdW50IC0gOF1bOF0gPSAoIXRlc3QpO1xuICBcbiAgfSxcbiAgXG4gIG1hcERhdGEgOiBmdW5jdGlvbihkYXRhLCBtYXNrUGF0dGVybikge1xuICAgIFxuICAgIHZhciBpbmMgPSAtMTtcbiAgICB2YXIgcm93ID0gdGhpcy5tb2R1bGVDb3VudCAtIDE7XG4gICAgdmFyIGJpdEluZGV4ID0gNztcbiAgICB2YXIgYnl0ZUluZGV4ID0gMDtcbiAgICBcbiAgICBmb3IgKHZhciBjb2wgPSB0aGlzLm1vZHVsZUNvdW50IC0gMTsgY29sID4gMDsgY29sIC09IDIpIHtcbiAgXG4gICAgICBpZiAoY29sID09IDYpIGNvbC0tO1xuICBcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gIFxuICAgICAgICBmb3IgKHZhciBjID0gMDsgYyA8IDI7IGMrKykge1xuICAgICAgICAgIFxuICAgICAgICAgIGlmICh0aGlzLm1vZHVsZXNbcm93XVtjb2wgLSBjXSA9PSBudWxsKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHZhciBkYXJrID0gZmFsc2U7XG4gIFxuICAgICAgICAgICAgaWYgKGJ5dGVJbmRleCA8IGRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIGRhcmsgPSAoICggKGRhdGFbYnl0ZUluZGV4XSA+Pj4gYml0SW5kZXgpICYgMSkgPT0gMSk7XG4gICAgICAgICAgICB9XG4gIFxuICAgICAgICAgICAgdmFyIG1hc2sgPSBRUlV0aWwuZ2V0TWFzayhtYXNrUGF0dGVybiwgcm93LCBjb2wgLSBjKTtcbiAgXG4gICAgICAgICAgICBpZiAobWFzaykge1xuICAgICAgICAgICAgICBkYXJrID0gIWRhcms7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRoaXMubW9kdWxlc1tyb3ddW2NvbCAtIGNdID0gZGFyaztcbiAgICAgICAgICAgIGJpdEluZGV4LS07XG4gIFxuICAgICAgICAgICAgaWYgKGJpdEluZGV4ID09IC0xKSB7XG4gICAgICAgICAgICAgIGJ5dGVJbmRleCsrO1xuICAgICAgICAgICAgICBiaXRJbmRleCA9IDc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIHJvdyArPSBpbmM7XG4gIFxuICAgICAgICBpZiAocm93IDwgMCB8fCB0aGlzLm1vZHVsZUNvdW50IDw9IHJvdykge1xuICAgICAgICAgIHJvdyAtPSBpbmM7XG4gICAgICAgICAgaW5jID0gLWluYztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBcbiAgfVxuXG59O1xuXG5RUkNvZGUuUEFEMCA9IDB4RUM7XG5RUkNvZGUuUEFEMSA9IDB4MTE7XG5cblFSQ29kZS5jcmVhdGVEYXRhID0gZnVuY3Rpb24odHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwsIGRhdGFMaXN0KSB7XG4gIFxuICB2YXIgcnNCbG9ja3MgPSBRUlJTQmxvY2suZ2V0UlNCbG9ja3ModHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpO1xuICBcbiAgdmFyIGJ1ZmZlciA9IG5ldyBRUkJpdEJ1ZmZlcigpO1xuICBcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBkYXRhTGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBkYXRhID0gZGF0YUxpc3RbaV07XG4gICAgYnVmZmVyLnB1dChkYXRhLm1vZGUsIDQpO1xuICAgIGJ1ZmZlci5wdXQoZGF0YS5nZXRMZW5ndGgoKSwgUVJVdGlsLmdldExlbmd0aEluQml0cyhkYXRhLm1vZGUsIHR5cGVOdW1iZXIpICk7XG4gICAgZGF0YS53cml0ZShidWZmZXIpO1xuICB9XG5cbiAgLy8gY2FsYyBudW0gbWF4IGRhdGEuXG4gIHZhciB0b3RhbERhdGFDb3VudCA9IDA7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgcnNCbG9ja3MubGVuZ3RoOyBpKyspIHtcbiAgICB0b3RhbERhdGFDb3VudCArPSByc0Jsb2Nrc1tpXS5kYXRhQ291bnQ7XG4gIH1cblxuICBpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpID4gdG90YWxEYXRhQ291bnQgKiA4KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiY29kZSBsZW5ndGggb3ZlcmZsb3cuIChcIlxuICAgICAgKyBidWZmZXIuZ2V0TGVuZ3RoSW5CaXRzKClcbiAgICAgICsgXCI+XCJcbiAgICAgICsgIHRvdGFsRGF0YUNvdW50ICogOFxuICAgICAgKyBcIilcIik7XG4gIH1cblxuICAvLyBlbmQgY29kZVxuICBpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpICsgNCA8PSB0b3RhbERhdGFDb3VudCAqIDgpIHtcbiAgICBidWZmZXIucHV0KDAsIDQpO1xuICB9XG5cbiAgLy8gcGFkZGluZ1xuICB3aGlsZSAoYnVmZmVyLmdldExlbmd0aEluQml0cygpICUgOCAhPSAwKSB7XG4gICAgYnVmZmVyLnB1dEJpdChmYWxzZSk7XG4gIH1cblxuICAvLyBwYWRkaW5nXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgXG4gICAgaWYgKGJ1ZmZlci5nZXRMZW5ndGhJbkJpdHMoKSA+PSB0b3RhbERhdGFDb3VudCAqIDgpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBidWZmZXIucHV0KFFSQ29kZS5QQUQwLCA4KTtcbiAgICBcbiAgICBpZiAoYnVmZmVyLmdldExlbmd0aEluQml0cygpID49IHRvdGFsRGF0YUNvdW50ICogOCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGJ1ZmZlci5wdXQoUVJDb2RlLlBBRDEsIDgpO1xuICB9XG5cbiAgcmV0dXJuIFFSQ29kZS5jcmVhdGVCeXRlcyhidWZmZXIsIHJzQmxvY2tzKTtcbn1cblxuUVJDb2RlLmNyZWF0ZUJ5dGVzID0gZnVuY3Rpb24oYnVmZmVyLCByc0Jsb2Nrcykge1xuXG4gIHZhciBvZmZzZXQgPSAwO1xuICBcbiAgdmFyIG1heERjQ291bnQgPSAwO1xuICB2YXIgbWF4RWNDb3VudCA9IDA7XG4gIFxuICB2YXIgZGNkYXRhID0gbmV3IEFycmF5KHJzQmxvY2tzLmxlbmd0aCk7XG4gIHZhciBlY2RhdGEgPSBuZXcgQXJyYXkocnNCbG9ja3MubGVuZ3RoKTtcbiAgXG4gIGZvciAodmFyIHIgPSAwOyByIDwgcnNCbG9ja3MubGVuZ3RoOyByKyspIHtcblxuICAgIHZhciBkY0NvdW50ID0gcnNCbG9ja3Nbcl0uZGF0YUNvdW50O1xuICAgIHZhciBlY0NvdW50ID0gcnNCbG9ja3Nbcl0udG90YWxDb3VudCAtIGRjQ291bnQ7XG5cbiAgICBtYXhEY0NvdW50ID0gTWF0aC5tYXgobWF4RGNDb3VudCwgZGNDb3VudCk7XG4gICAgbWF4RWNDb3VudCA9IE1hdGgubWF4KG1heEVjQ291bnQsIGVjQ291bnQpO1xuICAgIFxuICAgIGRjZGF0YVtyXSA9IG5ldyBBcnJheShkY0NvdW50KTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGRjZGF0YVtyXS5sZW5ndGg7IGkrKykge1xuICAgICAgZGNkYXRhW3JdW2ldID0gMHhmZiAmIGJ1ZmZlci5idWZmZXJbaSArIG9mZnNldF07XG4gICAgfVxuICAgIG9mZnNldCArPSBkY0NvdW50O1xuICAgIFxuICAgIHZhciByc1BvbHkgPSBRUlV0aWwuZ2V0RXJyb3JDb3JyZWN0UG9seW5vbWlhbChlY0NvdW50KTtcbiAgICB2YXIgcmF3UG9seSA9IG5ldyBRUlBvbHlub21pYWwoZGNkYXRhW3JdLCByc1BvbHkuZ2V0TGVuZ3RoKCkgLSAxKTtcblxuICAgIHZhciBtb2RQb2x5ID0gcmF3UG9seS5tb2QocnNQb2x5KTtcbiAgICBlY2RhdGFbcl0gPSBuZXcgQXJyYXkocnNQb2x5LmdldExlbmd0aCgpIC0gMSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlY2RhdGFbcl0ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtb2RJbmRleCA9IGkgKyBtb2RQb2x5LmdldExlbmd0aCgpIC0gZWNkYXRhW3JdLmxlbmd0aDtcbiAgICAgIGVjZGF0YVtyXVtpXSA9IChtb2RJbmRleCA+PSAwKT8gbW9kUG9seS5nZXQobW9kSW5kZXgpIDogMDtcbiAgICB9XG5cbiAgfVxuICBcbiAgdmFyIHRvdGFsQ29kZUNvdW50ID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCByc0Jsb2Nrcy5sZW5ndGg7IGkrKykge1xuICAgIHRvdGFsQ29kZUNvdW50ICs9IHJzQmxvY2tzW2ldLnRvdGFsQ291bnQ7XG4gIH1cblxuICB2YXIgZGF0YSA9IG5ldyBBcnJheSh0b3RhbENvZGVDb3VudCk7XG4gIHZhciBpbmRleCA9IDA7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhEY0NvdW50OyBpKyspIHtcbiAgICBmb3IgKHZhciByID0gMDsgciA8IHJzQmxvY2tzLmxlbmd0aDsgcisrKSB7XG4gICAgICBpZiAoaSA8IGRjZGF0YVtyXS5sZW5ndGgpIHtcbiAgICAgICAgZGF0YVtpbmRleCsrXSA9IGRjZGF0YVtyXVtpXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMDsgaSA8IG1heEVjQ291bnQ7IGkrKykge1xuICAgIGZvciAodmFyIHIgPSAwOyByIDwgcnNCbG9ja3MubGVuZ3RoOyByKyspIHtcbiAgICAgIGlmIChpIDwgZWNkYXRhW3JdLmxlbmd0aCkge1xuICAgICAgICBkYXRhW2luZGV4KytdID0gZWNkYXRhW3JdW2ldO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBkYXRhO1xuXG59XG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUk1vZGVcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBRUk1vZGUgPSB7XG4gIE1PREVfTlVNQkVSIDogICAxIDw8IDAsXG4gIE1PREVfQUxQSEFfTlVNIDogIDEgPDwgMSxcbiAgTU9ERV84QklUX0JZVEUgOiAgMSA8PCAyLFxuICBNT0RFX0tBTkpJIDogICAgMSA8PCAzXG59O1xuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUVJFcnJvckNvcnJlY3RMZXZlbFxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiBcbnZhciBRUkVycm9yQ29ycmVjdExldmVsID0ge1xuICBMIDogMSxcbiAgTSA6IDAsXG4gIFEgOiAzLFxuICBIIDogMlxufTtcblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSTWFza1BhdHRlcm5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBRUk1hc2tQYXR0ZXJuID0ge1xuICBQQVRURVJOMDAwIDogMCxcbiAgUEFUVEVSTjAwMSA6IDEsXG4gIFBBVFRFUk4wMTAgOiAyLFxuICBQQVRURVJOMDExIDogMyxcbiAgUEFUVEVSTjEwMCA6IDQsXG4gIFBBVFRFUk4xMDEgOiA1LFxuICBQQVRURVJOMTEwIDogNixcbiAgUEFUVEVSTjExMSA6IDdcbn07XG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUlV0aWxcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gXG52YXIgUVJVdGlsID0ge1xuXG4gICAgUEFUVEVSTl9QT1NJVElPTl9UQUJMRSA6IFtcbiAgICAgIFtdLFxuICAgICAgWzYsIDE4XSxcbiAgICAgIFs2LCAyMl0sXG4gICAgICBbNiwgMjZdLFxuICAgICAgWzYsIDMwXSxcbiAgICAgIFs2LCAzNF0sXG4gICAgICBbNiwgMjIsIDM4XSxcbiAgICAgIFs2LCAyNCwgNDJdLFxuICAgICAgWzYsIDI2LCA0Nl0sXG4gICAgICBbNiwgMjgsIDUwXSxcbiAgICAgIFs2LCAzMCwgNTRdLCAgICBcbiAgICAgIFs2LCAzMiwgNThdLFxuICAgICAgWzYsIDM0LCA2Ml0sXG4gICAgICBbNiwgMjYsIDQ2LCA2Nl0sXG4gICAgICBbNiwgMjYsIDQ4LCA3MF0sXG4gICAgICBbNiwgMjYsIDUwLCA3NF0sXG4gICAgICBbNiwgMzAsIDU0LCA3OF0sXG4gICAgICBbNiwgMzAsIDU2LCA4Ml0sXG4gICAgICBbNiwgMzAsIDU4LCA4Nl0sXG4gICAgICBbNiwgMzQsIDYyLCA5MF0sXG4gICAgICBbNiwgMjgsIDUwLCA3MiwgOTRdLFxuICAgICAgWzYsIDI2LCA1MCwgNzQsIDk4XSxcbiAgICAgIFs2LCAzMCwgNTQsIDc4LCAxMDJdLFxuICAgICAgWzYsIDI4LCA1NCwgODAsIDEwNl0sXG4gICAgICBbNiwgMzIsIDU4LCA4NCwgMTEwXSxcbiAgICAgIFs2LCAzMCwgNTgsIDg2LCAxMTRdLFxuICAgICAgWzYsIDM0LCA2MiwgOTAsIDExOF0sXG4gICAgICBbNiwgMjYsIDUwLCA3NCwgOTgsIDEyMl0sXG4gICAgICBbNiwgMzAsIDU0LCA3OCwgMTAyLCAxMjZdLFxuICAgICAgWzYsIDI2LCA1MiwgNzgsIDEwNCwgMTMwXSxcbiAgICAgIFs2LCAzMCwgNTYsIDgyLCAxMDgsIDEzNF0sXG4gICAgICBbNiwgMzQsIDYwLCA4NiwgMTEyLCAxMzhdLFxuICAgICAgWzYsIDMwLCA1OCwgODYsIDExNCwgMTQyXSxcbiAgICAgIFs2LCAzNCwgNjIsIDkwLCAxMTgsIDE0Nl0sXG4gICAgICBbNiwgMzAsIDU0LCA3OCwgMTAyLCAxMjYsIDE1MF0sXG4gICAgICBbNiwgMjQsIDUwLCA3NiwgMTAyLCAxMjgsIDE1NF0sXG4gICAgICBbNiwgMjgsIDU0LCA4MCwgMTA2LCAxMzIsIDE1OF0sXG4gICAgICBbNiwgMzIsIDU4LCA4NCwgMTEwLCAxMzYsIDE2Ml0sXG4gICAgICBbNiwgMjYsIDU0LCA4MiwgMTEwLCAxMzgsIDE2Nl0sXG4gICAgICBbNiwgMzAsIDU4LCA4NiwgMTE0LCAxNDIsIDE3MF1cbiAgICBdLFxuXG4gICAgRzE1IDogKDEgPDwgMTApIHwgKDEgPDwgOCkgfCAoMSA8PCA1KSB8ICgxIDw8IDQpIHwgKDEgPDwgMikgfCAoMSA8PCAxKSB8ICgxIDw8IDApLFxuICAgIEcxOCA6ICgxIDw8IDEyKSB8ICgxIDw8IDExKSB8ICgxIDw8IDEwKSB8ICgxIDw8IDkpIHwgKDEgPDwgOCkgfCAoMSA8PCA1KSB8ICgxIDw8IDIpIHwgKDEgPDwgMCksXG4gICAgRzE1X01BU0sgOiAoMSA8PCAxNCkgfCAoMSA8PCAxMikgfCAoMSA8PCAxMCkgIHwgKDEgPDwgNCkgfCAoMSA8PCAxKSxcblxuICAgIGdldEJDSFR5cGVJbmZvIDogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIGQgPSBkYXRhIDw8IDEwO1xuICAgICAgd2hpbGUgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE1KSA+PSAwKSB7XG4gICAgICAgIGQgXj0gKFFSVXRpbC5HMTUgPDwgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE1KSApICk7ICBcbiAgICAgIH1cbiAgICAgIHJldHVybiAoIChkYXRhIDw8IDEwKSB8IGQpIF4gUVJVdGlsLkcxNV9NQVNLO1xuICAgIH0sXG5cbiAgICBnZXRCQ0hUeXBlTnVtYmVyIDogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgdmFyIGQgPSBkYXRhIDw8IDEyO1xuICAgICAgd2hpbGUgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE4KSA+PSAwKSB7XG4gICAgICAgIGQgXj0gKFFSVXRpbC5HMTggPDwgKFFSVXRpbC5nZXRCQ0hEaWdpdChkKSAtIFFSVXRpbC5nZXRCQ0hEaWdpdChRUlV0aWwuRzE4KSApICk7ICBcbiAgICAgIH1cbiAgICAgIHJldHVybiAoZGF0YSA8PCAxMikgfCBkO1xuICAgIH0sXG5cbiAgICBnZXRCQ0hEaWdpdCA6IGZ1bmN0aW9uKGRhdGEpIHtcblxuICAgICAgdmFyIGRpZ2l0ID0gMDtcblxuICAgICAgd2hpbGUgKGRhdGEgIT0gMCkge1xuICAgICAgICBkaWdpdCsrO1xuICAgICAgICBkYXRhID4+Pj0gMTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRpZ2l0O1xuICAgIH0sXG5cbiAgICBnZXRQYXR0ZXJuUG9zaXRpb24gOiBmdW5jdGlvbih0eXBlTnVtYmVyKSB7XG4gICAgICByZXR1cm4gUVJVdGlsLlBBVFRFUk5fUE9TSVRJT05fVEFCTEVbdHlwZU51bWJlciAtIDFdO1xuICAgIH0sXG5cbiAgICBnZXRNYXNrIDogZnVuY3Rpb24obWFza1BhdHRlcm4sIGksIGopIHtcbiAgICAgIFxuICAgICAgc3dpdGNoIChtYXNrUGF0dGVybikge1xuICAgICAgICBcbiAgICAgIGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDAwIDogcmV0dXJuIChpICsgaikgJSAyID09IDA7XG4gICAgICBjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjAwMSA6IHJldHVybiBpICUgMiA9PSAwO1xuICAgICAgY2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4wMTAgOiByZXR1cm4gaiAlIDMgPT0gMDtcbiAgICAgIGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMDExIDogcmV0dXJuIChpICsgaikgJSAzID09IDA7XG4gICAgICBjYXNlIFFSTWFza1BhdHRlcm4uUEFUVEVSTjEwMCA6IHJldHVybiAoTWF0aC5mbG9vcihpIC8gMikgKyBNYXRoLmZsb29yKGogLyAzKSApICUgMiA9PSAwO1xuICAgICAgY2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMDEgOiByZXR1cm4gKGkgKiBqKSAlIDIgKyAoaSAqIGopICUgMyA9PSAwO1xuICAgICAgY2FzZSBRUk1hc2tQYXR0ZXJuLlBBVFRFUk4xMTAgOiByZXR1cm4gKCAoaSAqIGopICUgMiArIChpICogaikgJSAzKSAlIDIgPT0gMDtcbiAgICAgIGNhc2UgUVJNYXNrUGF0dGVybi5QQVRURVJOMTExIDogcmV0dXJuICggKGkgKiBqKSAlIDMgKyAoaSArIGopICUgMikgJSAyID09IDA7XG5cbiAgICAgIGRlZmF1bHQgOlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgbWFza1BhdHRlcm46XCIgKyBtYXNrUGF0dGVybik7XG4gICAgICB9XG4gICAgfSxcblxuICAgIGdldEVycm9yQ29ycmVjdFBvbHlub21pYWwgOiBmdW5jdGlvbihlcnJvckNvcnJlY3RMZW5ndGgpIHtcblxuICAgICAgdmFyIGEgPSBuZXcgUVJQb2x5bm9taWFsKFsxXSwgMCk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXJyb3JDb3JyZWN0TGVuZ3RoOyBpKyspIHtcbiAgICAgICAgYSA9IGEubXVsdGlwbHkobmV3IFFSUG9seW5vbWlhbChbMSwgUVJNYXRoLmdleHAoaSldLCAwKSApO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYTtcbiAgICB9LFxuXG4gICAgZ2V0TGVuZ3RoSW5CaXRzIDogZnVuY3Rpb24obW9kZSwgdHlwZSkge1xuXG4gICAgICBpZiAoMSA8PSB0eXBlICYmIHR5cGUgPCAxMCkge1xuXG4gICAgICAgIC8vIDEgLSA5XG5cbiAgICAgICAgc3dpdGNoKG1vZGUpIHtcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV9OVU1CRVIgICA6IHJldHVybiAxMDtcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV9BTFBIQV9OVU0gIDogcmV0dXJuIDk7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFICA6IHJldHVybiA4O1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX0tBTkpJICAgIDogcmV0dXJuIDg7XG4gICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIm1vZGU6XCIgKyBtb2RlKTtcbiAgICAgICAgfVxuXG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPCAyNykge1xuXG4gICAgICAgIC8vIDEwIC0gMjZcblxuICAgICAgICBzd2l0Y2gobW9kZSkge1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX05VTUJFUiAgIDogcmV0dXJuIDEyO1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX0FMUEhBX05VTSAgOiByZXR1cm4gMTE7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfOEJJVF9CWVRFICA6IHJldHVybiAxNjtcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV9LQU5KSSAgICA6IHJldHVybiAxMDtcbiAgICAgICAgZGVmYXVsdCA6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibW9kZTpcIiArIG1vZGUpO1xuICAgICAgICB9XG5cbiAgICAgIH0gZWxzZSBpZiAodHlwZSA8IDQxKSB7XG5cbiAgICAgICAgLy8gMjcgLSA0MFxuXG4gICAgICAgIHN3aXRjaChtb2RlKSB7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfTlVNQkVSICAgOiByZXR1cm4gMTQ7XG4gICAgICAgIGNhc2UgUVJNb2RlLk1PREVfQUxQSEFfTlVNICA6IHJldHVybiAxMztcbiAgICAgICAgY2FzZSBRUk1vZGUuTU9ERV84QklUX0JZVEUgIDogcmV0dXJuIDE2O1xuICAgICAgICBjYXNlIFFSTW9kZS5NT0RFX0tBTkpJICAgIDogcmV0dXJuIDEyO1xuICAgICAgICBkZWZhdWx0IDpcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJtb2RlOlwiICsgbW9kZSk7XG4gICAgICAgIH1cblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwidHlwZTpcIiArIHR5cGUpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRMb3N0UG9pbnQgOiBmdW5jdGlvbihxckNvZGUpIHtcbiAgICAgIFxuICAgICAgdmFyIG1vZHVsZUNvdW50ID0gcXJDb2RlLmdldE1vZHVsZUNvdW50KCk7XG4gICAgICBcbiAgICAgIHZhciBsb3N0UG9pbnQgPSAwO1xuICAgICAgXG4gICAgICAvLyBMRVZFTDFcbiAgICAgIFxuICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbW9kdWxlQ291bnQ7IHJvdysrKSB7XG5cbiAgICAgICAgZm9yICh2YXIgY29sID0gMDsgY29sIDwgbW9kdWxlQ291bnQ7IGNvbCsrKSB7XG5cbiAgICAgICAgICB2YXIgc2FtZUNvdW50ID0gMDtcbiAgICAgICAgICB2YXIgZGFyayA9IHFyQ29kZS5pc0Rhcmsocm93LCBjb2wpO1xuXG4gICAgICAgIGZvciAodmFyIHIgPSAtMTsgciA8PSAxOyByKyspIHtcblxuICAgICAgICAgICAgaWYgKHJvdyArIHIgPCAwIHx8IG1vZHVsZUNvdW50IDw9IHJvdyArIHIpIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAodmFyIGMgPSAtMTsgYyA8PSAxOyBjKyspIHtcblxuICAgICAgICAgICAgICBpZiAoY29sICsgYyA8IDAgfHwgbW9kdWxlQ291bnQgPD0gY29sICsgYykge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgaWYgKHIgPT0gMCAmJiBjID09IDApIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChkYXJrID09IHFyQ29kZS5pc0Rhcmsocm93ICsgciwgY29sICsgYykgKSB7XG4gICAgICAgICAgICAgICAgc2FtZUNvdW50Kys7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoc2FtZUNvdW50ID4gNSkge1xuICAgICAgICAgICAgbG9zdFBvaW50ICs9ICgzICsgc2FtZUNvdW50IC0gNSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIExFVkVMMlxuXG4gICAgICBmb3IgKHZhciByb3cgPSAwOyByb3cgPCBtb2R1bGVDb3VudCAtIDE7IHJvdysrKSB7XG4gICAgICAgIGZvciAodmFyIGNvbCA9IDA7IGNvbCA8IG1vZHVsZUNvdW50IC0gMTsgY29sKyspIHtcbiAgICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICAgIGlmIChxckNvZGUuaXNEYXJrKHJvdywgICAgIGNvbCAgICApICkgY291bnQrKztcbiAgICAgICAgICBpZiAocXJDb2RlLmlzRGFyayhyb3cgKyAxLCBjb2wgICAgKSApIGNvdW50Kys7XG4gICAgICAgICAgaWYgKHFyQ29kZS5pc0Rhcmsocm93LCAgICAgY29sICsgMSkgKSBjb3VudCsrO1xuICAgICAgICAgIGlmIChxckNvZGUuaXNEYXJrKHJvdyArIDEsIGNvbCArIDEpICkgY291bnQrKztcbiAgICAgICAgICBpZiAoY291bnQgPT0gMCB8fCBjb3VudCA9PSA0KSB7XG4gICAgICAgICAgICBsb3N0UG9pbnQgKz0gMztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTEVWRUwzXG5cbiAgICAgIGZvciAodmFyIHJvdyA9IDA7IHJvdyA8IG1vZHVsZUNvdW50OyByb3crKykge1xuICAgICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBtb2R1bGVDb3VudCAtIDY7IGNvbCsrKSB7XG4gICAgICAgICAgaWYgKHFyQ29kZS5pc0Rhcmsocm93LCBjb2wpXG4gICAgICAgICAgICAgICYmICFxckNvZGUuaXNEYXJrKHJvdywgY29sICsgMSlcbiAgICAgICAgICAgICAgJiYgIHFyQ29kZS5pc0Rhcmsocm93LCBjb2wgKyAyKVxuICAgICAgICAgICAgICAmJiAgcXJDb2RlLmlzRGFyayhyb3csIGNvbCArIDMpXG4gICAgICAgICAgICAgICYmICBxckNvZGUuaXNEYXJrKHJvdywgY29sICsgNClcbiAgICAgICAgICAgICAgJiYgIXFyQ29kZS5pc0Rhcmsocm93LCBjb2wgKyA1KVxuICAgICAgICAgICAgICAmJiAgcXJDb2RlLmlzRGFyayhyb3csIGNvbCArIDYpICkge1xuICAgICAgICAgICAgbG9zdFBvaW50ICs9IDQwO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBtb2R1bGVDb3VudDsgY29sKyspIHtcbiAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbW9kdWxlQ291bnQgLSA2OyByb3crKykge1xuICAgICAgICAgIGlmIChxckNvZGUuaXNEYXJrKHJvdywgY29sKVxuICAgICAgICAgICAgICAmJiAhcXJDb2RlLmlzRGFyayhyb3cgKyAxLCBjb2wpXG4gICAgICAgICAgICAgICYmICBxckNvZGUuaXNEYXJrKHJvdyArIDIsIGNvbClcbiAgICAgICAgICAgICAgJiYgIHFyQ29kZS5pc0Rhcmsocm93ICsgMywgY29sKVxuICAgICAgICAgICAgICAmJiAgcXJDb2RlLmlzRGFyayhyb3cgKyA0LCBjb2wpXG4gICAgICAgICAgICAgICYmICFxckNvZGUuaXNEYXJrKHJvdyArIDUsIGNvbClcbiAgICAgICAgICAgICAgJiYgIHFyQ29kZS5pc0Rhcmsocm93ICsgNiwgY29sKSApIHtcbiAgICAgICAgICAgIGxvc3RQb2ludCArPSA0MDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gTEVWRUw0XG4gICAgICBcbiAgICAgIHZhciBkYXJrQ291bnQgPSAwO1xuXG4gICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBtb2R1bGVDb3VudDsgY29sKyspIHtcbiAgICAgICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgbW9kdWxlQ291bnQ7IHJvdysrKSB7XG4gICAgICAgICAgaWYgKHFyQ29kZS5pc0Rhcmsocm93LCBjb2wpICkge1xuICAgICAgICAgICAgZGFya0NvdW50Kys7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIHZhciByYXRpbyA9IE1hdGguYWJzKDEwMCAqIGRhcmtDb3VudCAvIG1vZHVsZUNvdW50IC8gbW9kdWxlQ291bnQgLSA1MCkgLyA1O1xuICAgICAgbG9zdFBvaW50ICs9IHJhdGlvICogMTA7XG5cbiAgICAgIHJldHVybiBsb3N0UG9pbnQ7ICAgXG4gICAgfVxuXG59O1xuXG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUk1hdGhcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbnZhciBRUk1hdGggPSB7XG5cbiAgZ2xvZyA6IGZ1bmN0aW9uKG4pIHtcbiAgXG4gICAgaWYgKG4gPCAxKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJnbG9nKFwiICsgbiArIFwiKVwiKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIFFSTWF0aC5MT0dfVEFCTEVbbl07XG4gIH0sXG4gIFxuICBnZXhwIDogZnVuY3Rpb24obikge1xuICBcbiAgICB3aGlsZSAobiA8IDApIHtcbiAgICAgIG4gKz0gMjU1O1xuICAgIH1cbiAgXG4gICAgd2hpbGUgKG4gPj0gMjU2KSB7XG4gICAgICBuIC09IDI1NTtcbiAgICB9XG4gIFxuICAgIHJldHVybiBRUk1hdGguRVhQX1RBQkxFW25dO1xuICB9LFxuICBcbiAgRVhQX1RBQkxFIDogbmV3IEFycmF5KDI1NiksXG4gIFxuICBMT0dfVEFCTEUgOiBuZXcgQXJyYXkoMjU2KVxuXG59O1xuICBcbmZvciAodmFyIGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gIFFSTWF0aC5FWFBfVEFCTEVbaV0gPSAxIDw8IGk7XG59XG5mb3IgKHZhciBpID0gODsgaSA8IDI1NjsgaSsrKSB7XG4gIFFSTWF0aC5FWFBfVEFCTEVbaV0gPSBRUk1hdGguRVhQX1RBQkxFW2kgLSA0XVxuICAgIF4gUVJNYXRoLkVYUF9UQUJMRVtpIC0gNV1cbiAgICBeIFFSTWF0aC5FWFBfVEFCTEVbaSAtIDZdXG4gICAgXiBRUk1hdGguRVhQX1RBQkxFW2kgLSA4XTtcbn1cbmZvciAodmFyIGkgPSAwOyBpIDwgMjU1OyBpKyspIHtcbiAgUVJNYXRoLkxPR19UQUJMRVtRUk1hdGguRVhQX1RBQkxFW2ldIF0gPSBpO1xufVxuXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8gUVJQb2x5bm9taWFsXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBRUlBvbHlub21pYWwobnVtLCBzaGlmdCkge1xuXG4gIGlmIChudW0ubGVuZ3RoID09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IG5ldyBFcnJvcihudW0ubGVuZ3RoICsgXCIvXCIgKyBzaGlmdCk7XG4gIH1cblxuICB2YXIgb2Zmc2V0ID0gMDtcblxuICB3aGlsZSAob2Zmc2V0IDwgbnVtLmxlbmd0aCAmJiBudW1bb2Zmc2V0XSA9PSAwKSB7XG4gICAgb2Zmc2V0Kys7XG4gIH1cblxuICB0aGlzLm51bSA9IG5ldyBBcnJheShudW0ubGVuZ3RoIC0gb2Zmc2V0ICsgc2hpZnQpO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IG51bS5sZW5ndGggLSBvZmZzZXQ7IGkrKykge1xuICAgIHRoaXMubnVtW2ldID0gbnVtW2kgKyBvZmZzZXRdO1xuICB9XG59XG5cblFSUG9seW5vbWlhbC5wcm90b3R5cGUgPSB7XG5cbiAgZ2V0IDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICByZXR1cm4gdGhpcy5udW1baW5kZXhdO1xuICB9LFxuICBcbiAgZ2V0TGVuZ3RoIDogZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXMubnVtLmxlbmd0aDtcbiAgfSxcbiAgXG4gIG11bHRpcGx5IDogZnVuY3Rpb24oZSkge1xuICBcbiAgICB2YXIgbnVtID0gbmV3IEFycmF5KHRoaXMuZ2V0TGVuZ3RoKCkgKyBlLmdldExlbmd0aCgpIC0gMSk7XG4gIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5nZXRMZW5ndGgoKTsgaSsrKSB7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGUuZ2V0TGVuZ3RoKCk7IGorKykge1xuICAgICAgICBudW1baSArIGpdIF49IFFSTWF0aC5nZXhwKFFSTWF0aC5nbG9nKHRoaXMuZ2V0KGkpICkgKyBRUk1hdGguZ2xvZyhlLmdldChqKSApICk7XG4gICAgICB9XG4gICAgfVxuICBcbiAgICByZXR1cm4gbmV3IFFSUG9seW5vbWlhbChudW0sIDApO1xuICB9LFxuICBcbiAgbW9kIDogZnVuY3Rpb24oZSkge1xuICBcbiAgICBpZiAodGhpcy5nZXRMZW5ndGgoKSAtIGUuZ2V0TGVuZ3RoKCkgPCAwKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIFxuICAgIHZhciByYXRpbyA9IFFSTWF0aC5nbG9nKHRoaXMuZ2V0KDApICkgLSBRUk1hdGguZ2xvZyhlLmdldCgwKSApO1xuICBcbiAgICB2YXIgbnVtID0gbmV3IEFycmF5KHRoaXMuZ2V0TGVuZ3RoKCkgKTtcbiAgICBcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZ2V0TGVuZ3RoKCk7IGkrKykge1xuICAgICAgbnVtW2ldID0gdGhpcy5nZXQoaSk7XG4gICAgfVxuICAgIFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZS5nZXRMZW5ndGgoKTsgaSsrKSB7XG4gICAgICBudW1baV0gXj0gUVJNYXRoLmdleHAoUVJNYXRoLmdsb2coZS5nZXQoaSkgKSArIHJhdGlvKTtcbiAgICB9XG4gIFxuICAgIC8vIHJlY3Vyc2l2ZSBjYWxsXG4gICAgcmV0dXJuIG5ldyBRUlBvbHlub21pYWwobnVtLCAwKS5tb2QoZSk7XG4gIH1cbn07XG5cbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4vLyBRUlJTQmxvY2tcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmZ1bmN0aW9uIFFSUlNCbG9jayh0b3RhbENvdW50LCBkYXRhQ291bnQpIHtcbiAgdGhpcy50b3RhbENvdW50ID0gdG90YWxDb3VudDtcbiAgdGhpcy5kYXRhQ291bnQgID0gZGF0YUNvdW50O1xufVxuXG5RUlJTQmxvY2suUlNfQkxPQ0tfVEFCTEUgPSBbXG5cbiAgLy8gTFxuICAvLyBNXG4gIC8vIFFcbiAgLy8gSFxuXG4gIC8vIDFcbiAgWzEsIDI2LCAxOV0sXG4gIFsxLCAyNiwgMTZdLFxuICBbMSwgMjYsIDEzXSxcbiAgWzEsIDI2LCA5XSxcbiAgXG4gIC8vIDJcbiAgWzEsIDQ0LCAzNF0sXG4gIFsxLCA0NCwgMjhdLFxuICBbMSwgNDQsIDIyXSxcbiAgWzEsIDQ0LCAxNl0sXG5cbiAgLy8gM1xuICBbMSwgNzAsIDU1XSxcbiAgWzEsIDcwLCA0NF0sXG4gIFsyLCAzNSwgMTddLFxuICBbMiwgMzUsIDEzXSxcblxuICAvLyA0ICAgIFxuICBbMSwgMTAwLCA4MF0sXG4gIFsyLCA1MCwgMzJdLFxuICBbMiwgNTAsIDI0XSxcbiAgWzQsIDI1LCA5XSxcbiAgXG4gIC8vIDVcbiAgWzEsIDEzNCwgMTA4XSxcbiAgWzIsIDY3LCA0M10sXG4gIFsyLCAzMywgMTUsIDIsIDM0LCAxNl0sXG4gIFsyLCAzMywgMTEsIDIsIDM0LCAxMl0sXG4gIFxuICAvLyA2XG4gIFsyLCA4NiwgNjhdLFxuICBbNCwgNDMsIDI3XSxcbiAgWzQsIDQzLCAxOV0sXG4gIFs0LCA0MywgMTVdLFxuICBcbiAgLy8gNyAgICBcbiAgWzIsIDk4LCA3OF0sXG4gIFs0LCA0OSwgMzFdLFxuICBbMiwgMzIsIDE0LCA0LCAzMywgMTVdLFxuICBbNCwgMzksIDEzLCAxLCA0MCwgMTRdLFxuICBcbiAgLy8gOFxuICBbMiwgMTIxLCA5N10sXG4gIFsyLCA2MCwgMzgsIDIsIDYxLCAzOV0sXG4gIFs0LCA0MCwgMTgsIDIsIDQxLCAxOV0sXG4gIFs0LCA0MCwgMTQsIDIsIDQxLCAxNV0sXG4gIFxuICAvLyA5XG4gIFsyLCAxNDYsIDExNl0sXG4gIFszLCA1OCwgMzYsIDIsIDU5LCAzN10sXG4gIFs0LCAzNiwgMTYsIDQsIDM3LCAxN10sXG4gIFs0LCAzNiwgMTIsIDQsIDM3LCAxM10sXG4gIFxuICAvLyAxMCAgIFxuICBbMiwgODYsIDY4LCAyLCA4NywgNjldLFxuICBbNCwgNjksIDQzLCAxLCA3MCwgNDRdLFxuICBbNiwgNDMsIDE5LCAyLCA0NCwgMjBdLFxuICBbNiwgNDMsIDE1LCAyLCA0NCwgMTZdLFxuXG4gIC8vIDExXG4gIFs0LCAxMDEsIDgxXSxcbiAgWzEsIDgwLCA1MCwgNCwgODEsIDUxXSxcbiAgWzQsIDUwLCAyMiwgNCwgNTEsIDIzXSxcbiAgWzMsIDM2LCAxMiwgOCwgMzcsIDEzXSxcblxuICAvLyAxMlxuICBbMiwgMTE2LCA5MiwgMiwgMTE3LCA5M10sXG4gIFs2LCA1OCwgMzYsIDIsIDU5LCAzN10sXG4gIFs0LCA0NiwgMjAsIDYsIDQ3LCAyMV0sXG4gIFs3LCA0MiwgMTQsIDQsIDQzLCAxNV0sXG5cbiAgLy8gMTNcbiAgWzQsIDEzMywgMTA3XSxcbiAgWzgsIDU5LCAzNywgMSwgNjAsIDM4XSxcbiAgWzgsIDQ0LCAyMCwgNCwgNDUsIDIxXSxcbiAgWzEyLCAzMywgMTEsIDQsIDM0LCAxMl0sXG5cbiAgLy8gMTRcbiAgWzMsIDE0NSwgMTE1LCAxLCAxNDYsIDExNl0sXG4gIFs0LCA2NCwgNDAsIDUsIDY1LCA0MV0sXG4gIFsxMSwgMzYsIDE2LCA1LCAzNywgMTddLFxuICBbMTEsIDM2LCAxMiwgNSwgMzcsIDEzXSxcblxuICAvLyAxNVxuICBbNSwgMTA5LCA4NywgMSwgMTEwLCA4OF0sXG4gIFs1LCA2NSwgNDEsIDUsIDY2LCA0Ml0sXG4gIFs1LCA1NCwgMjQsIDcsIDU1LCAyNV0sXG4gIFsxMSwgMzYsIDEyXSxcblxuICAvLyAxNlxuICBbNSwgMTIyLCA5OCwgMSwgMTIzLCA5OV0sXG4gIFs3LCA3MywgNDUsIDMsIDc0LCA0Nl0sXG4gIFsxNSwgNDMsIDE5LCAyLCA0NCwgMjBdLFxuICBbMywgNDUsIDE1LCAxMywgNDYsIDE2XSxcblxuICAvLyAxN1xuICBbMSwgMTM1LCAxMDcsIDUsIDEzNiwgMTA4XSxcbiAgWzEwLCA3NCwgNDYsIDEsIDc1LCA0N10sXG4gIFsxLCA1MCwgMjIsIDE1LCA1MSwgMjNdLFxuICBbMiwgNDIsIDE0LCAxNywgNDMsIDE1XSxcblxuICAvLyAxOFxuICBbNSwgMTUwLCAxMjAsIDEsIDE1MSwgMTIxXSxcbiAgWzksIDY5LCA0MywgNCwgNzAsIDQ0XSxcbiAgWzE3LCA1MCwgMjIsIDEsIDUxLCAyM10sXG4gIFsyLCA0MiwgMTQsIDE5LCA0MywgMTVdLFxuXG4gIC8vIDE5XG4gIFszLCAxNDEsIDExMywgNCwgMTQyLCAxMTRdLFxuICBbMywgNzAsIDQ0LCAxMSwgNzEsIDQ1XSxcbiAgWzE3LCA0NywgMjEsIDQsIDQ4LCAyMl0sXG4gIFs5LCAzOSwgMTMsIDE2LCA0MCwgMTRdLFxuXG4gIC8vIDIwXG4gIFszLCAxMzUsIDEwNywgNSwgMTM2LCAxMDhdLFxuICBbMywgNjcsIDQxLCAxMywgNjgsIDQyXSxcbiAgWzE1LCA1NCwgMjQsIDUsIDU1LCAyNV0sXG4gIFsxNSwgNDMsIDE1LCAxMCwgNDQsIDE2XSxcblxuICAvLyAyMVxuICBbNCwgMTQ0LCAxMTYsIDQsIDE0NSwgMTE3XSxcbiAgWzE3LCA2OCwgNDJdLFxuICBbMTcsIDUwLCAyMiwgNiwgNTEsIDIzXSxcbiAgWzE5LCA0NiwgMTYsIDYsIDQ3LCAxN10sXG5cbiAgLy8gMjJcbiAgWzIsIDEzOSwgMTExLCA3LCAxNDAsIDExMl0sXG4gIFsxNywgNzQsIDQ2XSxcbiAgWzcsIDU0LCAyNCwgMTYsIDU1LCAyNV0sXG4gIFszNCwgMzcsIDEzXSxcblxuICAvLyAyM1xuICBbNCwgMTUxLCAxMjEsIDUsIDE1MiwgMTIyXSxcbiAgWzQsIDc1LCA0NywgMTQsIDc2LCA0OF0sXG4gIFsxMSwgNTQsIDI0LCAxNCwgNTUsIDI1XSxcbiAgWzE2LCA0NSwgMTUsIDE0LCA0NiwgMTZdLFxuXG4gIC8vIDI0XG4gIFs2LCAxNDcsIDExNywgNCwgMTQ4LCAxMThdLFxuICBbNiwgNzMsIDQ1LCAxNCwgNzQsIDQ2XSxcbiAgWzExLCA1NCwgMjQsIDE2LCA1NSwgMjVdLFxuICBbMzAsIDQ2LCAxNiwgMiwgNDcsIDE3XSxcblxuICAvLyAyNVxuICBbOCwgMTMyLCAxMDYsIDQsIDEzMywgMTA3XSxcbiAgWzgsIDc1LCA0NywgMTMsIDc2LCA0OF0sXG4gIFs3LCA1NCwgMjQsIDIyLCA1NSwgMjVdLFxuICBbMjIsIDQ1LCAxNSwgMTMsIDQ2LCAxNl0sXG5cbiAgLy8gMjZcbiAgWzEwLCAxNDIsIDExNCwgMiwgMTQzLCAxMTVdLFxuICBbMTksIDc0LCA0NiwgNCwgNzUsIDQ3XSxcbiAgWzI4LCA1MCwgMjIsIDYsIDUxLCAyM10sXG4gIFszMywgNDYsIDE2LCA0LCA0NywgMTddLFxuXG4gIC8vIDI3XG4gIFs4LCAxNTIsIDEyMiwgNCwgMTUzLCAxMjNdLFxuICBbMjIsIDczLCA0NSwgMywgNzQsIDQ2XSxcbiAgWzgsIDUzLCAyMywgMjYsIDU0LCAyNF0sXG4gIFsxMiwgNDUsIDE1LCAyOCwgNDYsIDE2XSxcblxuICAvLyAyOFxuICBbMywgMTQ3LCAxMTcsIDEwLCAxNDgsIDExOF0sXG4gIFszLCA3MywgNDUsIDIzLCA3NCwgNDZdLFxuICBbNCwgNTQsIDI0LCAzMSwgNTUsIDI1XSxcbiAgWzExLCA0NSwgMTUsIDMxLCA0NiwgMTZdLFxuXG4gIC8vIDI5XG4gIFs3LCAxNDYsIDExNiwgNywgMTQ3LCAxMTddLFxuICBbMjEsIDczLCA0NSwgNywgNzQsIDQ2XSxcbiAgWzEsIDUzLCAyMywgMzcsIDU0LCAyNF0sXG4gIFsxOSwgNDUsIDE1LCAyNiwgNDYsIDE2XSxcblxuICAvLyAzMFxuICBbNSwgMTQ1LCAxMTUsIDEwLCAxNDYsIDExNl0sXG4gIFsxOSwgNzUsIDQ3LCAxMCwgNzYsIDQ4XSxcbiAgWzE1LCA1NCwgMjQsIDI1LCA1NSwgMjVdLFxuICBbMjMsIDQ1LCAxNSwgMjUsIDQ2LCAxNl0sXG5cbiAgLy8gMzFcbiAgWzEzLCAxNDUsIDExNSwgMywgMTQ2LCAxMTZdLFxuICBbMiwgNzQsIDQ2LCAyOSwgNzUsIDQ3XSxcbiAgWzQyLCA1NCwgMjQsIDEsIDU1LCAyNV0sXG4gIFsyMywgNDUsIDE1LCAyOCwgNDYsIDE2XSxcblxuICAvLyAzMlxuICBbMTcsIDE0NSwgMTE1XSxcbiAgWzEwLCA3NCwgNDYsIDIzLCA3NSwgNDddLFxuICBbMTAsIDU0LCAyNCwgMzUsIDU1LCAyNV0sXG4gIFsxOSwgNDUsIDE1LCAzNSwgNDYsIDE2XSxcblxuICAvLyAzM1xuICBbMTcsIDE0NSwgMTE1LCAxLCAxNDYsIDExNl0sXG4gIFsxNCwgNzQsIDQ2LCAyMSwgNzUsIDQ3XSxcbiAgWzI5LCA1NCwgMjQsIDE5LCA1NSwgMjVdLFxuICBbMTEsIDQ1LCAxNSwgNDYsIDQ2LCAxNl0sXG5cbiAgLy8gMzRcbiAgWzEzLCAxNDUsIDExNSwgNiwgMTQ2LCAxMTZdLFxuICBbMTQsIDc0LCA0NiwgMjMsIDc1LCA0N10sXG4gIFs0NCwgNTQsIDI0LCA3LCA1NSwgMjVdLFxuICBbNTksIDQ2LCAxNiwgMSwgNDcsIDE3XSxcblxuICAvLyAzNVxuICBbMTIsIDE1MSwgMTIxLCA3LCAxNTIsIDEyMl0sXG4gIFsxMiwgNzUsIDQ3LCAyNiwgNzYsIDQ4XSxcbiAgWzM5LCA1NCwgMjQsIDE0LCA1NSwgMjVdLFxuICBbMjIsIDQ1LCAxNSwgNDEsIDQ2LCAxNl0sXG5cbiAgLy8gMzZcbiAgWzYsIDE1MSwgMTIxLCAxNCwgMTUyLCAxMjJdLFxuICBbNiwgNzUsIDQ3LCAzNCwgNzYsIDQ4XSxcbiAgWzQ2LCA1NCwgMjQsIDEwLCA1NSwgMjVdLFxuICBbMiwgNDUsIDE1LCA2NCwgNDYsIDE2XSxcblxuICAvLyAzN1xuICBbMTcsIDE1MiwgMTIyLCA0LCAxNTMsIDEyM10sXG4gIFsyOSwgNzQsIDQ2LCAxNCwgNzUsIDQ3XSxcbiAgWzQ5LCA1NCwgMjQsIDEwLCA1NSwgMjVdLFxuICBbMjQsIDQ1LCAxNSwgNDYsIDQ2LCAxNl0sXG5cbiAgLy8gMzhcbiAgWzQsIDE1MiwgMTIyLCAxOCwgMTUzLCAxMjNdLFxuICBbMTMsIDc0LCA0NiwgMzIsIDc1LCA0N10sXG4gIFs0OCwgNTQsIDI0LCAxNCwgNTUsIDI1XSxcbiAgWzQyLCA0NSwgMTUsIDMyLCA0NiwgMTZdLFxuXG4gIC8vIDM5XG4gIFsyMCwgMTQ3LCAxMTcsIDQsIDE0OCwgMTE4XSxcbiAgWzQwLCA3NSwgNDcsIDcsIDc2LCA0OF0sXG4gIFs0MywgNTQsIDI0LCAyMiwgNTUsIDI1XSxcbiAgWzEwLCA0NSwgMTUsIDY3LCA0NiwgMTZdLFxuXG4gIC8vIDQwXG4gIFsxOSwgMTQ4LCAxMTgsIDYsIDE0OSwgMTE5XSxcbiAgWzE4LCA3NSwgNDcsIDMxLCA3NiwgNDhdLFxuICBbMzQsIDU0LCAyNCwgMzQsIDU1LCAyNV0sXG4gIFsyMCwgNDUsIDE1LCA2MSwgNDYsIDE2XVxuXTtcblxuUVJSU0Jsb2NrLmdldFJTQmxvY2tzID0gZnVuY3Rpb24odHlwZU51bWJlciwgZXJyb3JDb3JyZWN0TGV2ZWwpIHtcbiAgXG4gIHZhciByc0Jsb2NrID0gUVJSU0Jsb2NrLmdldFJzQmxvY2tUYWJsZSh0eXBlTnVtYmVyLCBlcnJvckNvcnJlY3RMZXZlbCk7XG4gIFxuICBpZiAocnNCbG9jayA9PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJiYWQgcnMgYmxvY2sgQCB0eXBlTnVtYmVyOlwiICsgdHlwZU51bWJlciArIFwiL2Vycm9yQ29ycmVjdExldmVsOlwiICsgZXJyb3JDb3JyZWN0TGV2ZWwpO1xuICB9XG5cbiAgdmFyIGxlbmd0aCA9IHJzQmxvY2subGVuZ3RoIC8gMztcbiAgXG4gIHZhciBsaXN0ID0gbmV3IEFycmF5KCk7XG4gIFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG5cbiAgICB2YXIgY291bnQgPSByc0Jsb2NrW2kgKiAzICsgMF07XG4gICAgdmFyIHRvdGFsQ291bnQgPSByc0Jsb2NrW2kgKiAzICsgMV07XG4gICAgdmFyIGRhdGFDb3VudCAgPSByc0Jsb2NrW2kgKiAzICsgMl07XG5cbiAgICBmb3IgKHZhciBqID0gMDsgaiA8IGNvdW50OyBqKyspIHtcbiAgICAgIGxpc3QucHVzaChuZXcgUVJSU0Jsb2NrKHRvdGFsQ291bnQsIGRhdGFDb3VudCkgKTsgXG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4gbGlzdDtcbn1cblxuUVJSU0Jsb2NrLmdldFJzQmxvY2tUYWJsZSA9IGZ1bmN0aW9uKHR5cGVOdW1iZXIsIGVycm9yQ29ycmVjdExldmVsKSB7XG5cbiAgc3dpdGNoKGVycm9yQ29ycmVjdExldmVsKSB7XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5MIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgMF07XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5NIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgMV07XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5RIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgMl07XG4gIGNhc2UgUVJFcnJvckNvcnJlY3RMZXZlbC5IIDpcbiAgICByZXR1cm4gUVJSU0Jsb2NrLlJTX0JMT0NLX1RBQkxFWyh0eXBlTnVtYmVyIC0gMSkgKiA0ICsgM107XG4gIGRlZmF1bHQgOlxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vIFFSQml0QnVmZmVyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5mdW5jdGlvbiBRUkJpdEJ1ZmZlcigpIHtcbiAgdGhpcy5idWZmZXIgPSBuZXcgQXJyYXkoKTtcbiAgdGhpcy5sZW5ndGggPSAwO1xufVxuXG5RUkJpdEJ1ZmZlci5wcm90b3R5cGUgPSB7XG5cbiAgZ2V0IDogZnVuY3Rpb24oaW5kZXgpIHtcbiAgICB2YXIgYnVmSW5kZXggPSBNYXRoLmZsb29yKGluZGV4IC8gOCk7XG4gICAgcmV0dXJuICggKHRoaXMuYnVmZmVyW2J1ZkluZGV4XSA+Pj4gKDcgLSBpbmRleCAlIDgpICkgJiAxKSA9PSAxO1xuICB9LFxuICBcbiAgcHV0IDogZnVuY3Rpb24obnVtLCBsZW5ndGgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB0aGlzLnB1dEJpdCggKCAobnVtID4+PiAobGVuZ3RoIC0gaSAtIDEpICkgJiAxKSA9PSAxKTtcbiAgICB9XG4gIH0sXG4gIFxuICBnZXRMZW5ndGhJbkJpdHMgOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcy5sZW5ndGg7XG4gIH0sXG4gIFxuICBwdXRCaXQgOiBmdW5jdGlvbihiaXQpIHtcbiAgXG4gICAgdmFyIGJ1ZkluZGV4ID0gTWF0aC5mbG9vcih0aGlzLmxlbmd0aCAvIDgpO1xuICAgIGlmICh0aGlzLmJ1ZmZlci5sZW5ndGggPD0gYnVmSW5kZXgpIHtcbiAgICAgIHRoaXMuYnVmZmVyLnB1c2goMCk7XG4gICAgfVxuICBcbiAgICBpZiAoYml0KSB7XG4gICAgICB0aGlzLmJ1ZmZlcltidWZJbmRleF0gfD0gKDB4ODAgPj4+ICh0aGlzLmxlbmd0aCAlIDgpICk7XG4gICAgfVxuICBcbiAgICB0aGlzLmxlbmd0aCsrO1xuICB9XG59O1xuXG5leHBvcnQge1xuICBRUkNvZGUsXG4gIFFSRXJyb3JDb3JyZWN0TGV2ZWxcbn1cbiIsImltcG9ydCB7IFFSQ29kZSwgUVJFcnJvckNvcnJlY3RMZXZlbCB9IGZyb20gJy4vcXJjb2RlJ1xuXG5mdW5jdGlvbiBkcmF3UXJjb2RlIChvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gIG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHtcbiAgICB3aWR0aDogMjU2LFxuICAgIGhlaWdodDogMjU2LFxuICAgIHR5cGVOdW1iZXI6IC0xLFxuICAgIGNvcnJlY3RMZXZlbDogUVJFcnJvckNvcnJlY3RMZXZlbC5ILFxuICAgIGJhY2tncm91bmQ6ICcjZmZmZmZmJyxcbiAgICBmb3JlZ3JvdW5kOiAnIzAwMDAwMCdcbiAgfSwgb3B0aW9ucylcblxuICBpZiAoIW9wdGlvbnMuY2FudmFzSWQpIHtcbiAgICBjb25zb2xlLndhcm4oJ3BsZWFzZSB5b3Ugc2V0IGNhbnZhc0lkIScpXG4gICAgcmV0dXJuXG4gIH1cblxuICBjcmVhdGVDYW52YXMoKVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZUNhbnZhcyAoKSB7XG4gICAgLy8gY3JlYXRlIHRoZSBxcmNvZGUgaXRzZWxmXG4gICAgdmFyIHFyY29kZSA9IG5ldyBRUkNvZGUob3B0aW9ucy50eXBlTnVtYmVyLCBvcHRpb25zLmNvcnJlY3RMZXZlbClcbiAgICBxcmNvZGUuYWRkRGF0YShvcHRpb25zLnRleHQpXG4gICAgcXJjb2RlLm1ha2UoKVxuXG4gICAgLy8gZ2V0IGNhbnZhcyBjb250ZXh0XG4gICAgdmFyIGN0eCA9IHd4LmNyZWF0ZUNhbnZhc0NvbnRleHQgJiYgd3guY3JlYXRlQ2FudmFzQ29udGV4dChvcHRpb25zLmNhbnZhc0lkKVxuXG4gICAgLy8gY29tcHV0ZSB0aWxlVy90aWxlSCBiYXNlZCBvbiBvcHRpb25zLndpZHRoL29wdGlvbnMuaGVpZ2h0XG4gICAgdmFyIHRpbGVXID0gb3B0aW9ucy53aWR0aCAvIHFyY29kZS5nZXRNb2R1bGVDb3VudCgpXG4gICAgdmFyIHRpbGVIID0gb3B0aW9ucy5oZWlnaHQgLyBxcmNvZGUuZ2V0TW9kdWxlQ291bnQoKVxuXG4gICAgLy8gZHJhdyBpbiB0aGUgY2FudmFzXG4gICAgZm9yICh2YXIgcm93ID0gMDsgcm93IDwgcXJjb2RlLmdldE1vZHVsZUNvdW50KCk7IHJvdysrKSB7XG4gICAgICBmb3IgKHZhciBjb2wgPSAwOyBjb2wgPCBxcmNvZGUuZ2V0TW9kdWxlQ291bnQoKTsgY29sKyspIHtcbiAgICAgICAgdmFyIHN0eWxlID0gcXJjb2RlLmlzRGFyayhyb3csIGNvbCkgPyBvcHRpb25zLmZvcmVncm91bmQgOiBvcHRpb25zLmJhY2tncm91bmRcbiAgICAgICAgY3R4LnNldEZpbGxTdHlsZShzdHlsZSlcbiAgICAgICAgdmFyIHcgPSAoTWF0aC5jZWlsKChjb2wgKyAxKSAqIHRpbGVXKSAtIE1hdGguZmxvb3IoY29sICogdGlsZVcpKVxuICAgICAgICB2YXIgaCA9IChNYXRoLmNlaWwoKHJvdyArIDEpICogdGlsZVcpIC0gTWF0aC5mbG9vcihyb3cgKiB0aWxlVykpXG4gICAgICAgIGN0eC5maWxsUmVjdChNYXRoLnJvdW5kKGNvbCAqIHRpbGVXKSwgTWF0aC5yb3VuZChyb3cgKiB0aWxlSCksIHcsIGgpXG4gICAgICB9XG4gICAgfVxuICAgIGN0eC5kcmF3KClcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBkcmF3UXJjb2RlXG4iXSwibmFtZXMiOlsiUVI4Yml0Qnl0ZSIsImRhdGEiLCJtb2RlIiwiUVJNb2RlIiwiTU9ERV84QklUX0JZVEUiLCJwcm90b3R5cGUiLCJidWZmZXIiLCJsZW5ndGgiLCJpIiwicHV0IiwiY2hhckNvZGVBdCIsIlFSQ29kZSIsInR5cGVOdW1iZXIiLCJlcnJvckNvcnJlY3RMZXZlbCIsIm1vZHVsZXMiLCJtb2R1bGVDb3VudCIsImRhdGFDYWNoZSIsImRhdGFMaXN0IiwiQXJyYXkiLCJuZXdEYXRhIiwicHVzaCIsInJvdyIsImNvbCIsIkVycm9yIiwicnNCbG9ja3MiLCJRUlJTQmxvY2siLCJnZXRSU0Jsb2NrcyIsIlFSQml0QnVmZmVyIiwidG90YWxEYXRhQ291bnQiLCJkYXRhQ291bnQiLCJnZXRMZW5ndGgiLCJRUlV0aWwiLCJnZXRMZW5ndGhJbkJpdHMiLCJ3cml0ZSIsIm1ha2VJbXBsIiwiZ2V0QmVzdE1hc2tQYXR0ZXJuIiwidGVzdCIsIm1hc2tQYXR0ZXJuIiwic2V0dXBQb3NpdGlvblByb2JlUGF0dGVybiIsInNldHVwUG9zaXRpb25BZGp1c3RQYXR0ZXJuIiwic2V0dXBUaW1pbmdQYXR0ZXJuIiwic2V0dXBUeXBlSW5mbyIsInNldHVwVHlwZU51bWJlciIsImNyZWF0ZURhdGEiLCJtYXBEYXRhIiwiciIsImMiLCJtaW5Mb3N0UG9pbnQiLCJwYXR0ZXJuIiwibG9zdFBvaW50IiwiZ2V0TG9zdFBvaW50IiwidGFyZ2V0X21jIiwiaW5zdGFuY2VfbmFtZSIsImRlcHRoIiwicXJfbWMiLCJjcmVhdGVFbXB0eU1vdmllQ2xpcCIsImNzIiwibWFrZSIsInkiLCJ4IiwiZGFyayIsImJlZ2luRmlsbCIsIm1vdmVUbyIsImxpbmVUbyIsImVuZEZpbGwiLCJwb3MiLCJnZXRQYXR0ZXJuUG9zaXRpb24iLCJqIiwiYml0cyIsImdldEJDSFR5cGVOdW1iZXIiLCJtb2QiLCJNYXRoIiwiZmxvb3IiLCJnZXRCQ0hUeXBlSW5mbyIsImluYyIsImJpdEluZGV4IiwiYnl0ZUluZGV4IiwibWFzayIsImdldE1hc2siLCJQQUQwIiwiUEFEMSIsInB1dEJpdCIsImNyZWF0ZUJ5dGVzIiwib2Zmc2V0IiwibWF4RGNDb3VudCIsIm1heEVjQ291bnQiLCJkY2RhdGEiLCJlY2RhdGEiLCJkY0NvdW50IiwiZWNDb3VudCIsInRvdGFsQ291bnQiLCJtYXgiLCJyc1BvbHkiLCJnZXRFcnJvckNvcnJlY3RQb2x5bm9taWFsIiwicmF3UG9seSIsIlFSUG9seW5vbWlhbCIsIm1vZFBvbHkiLCJtb2RJbmRleCIsImdldCIsInRvdGFsQ29kZUNvdW50IiwiaW5kZXgiLCJRUkVycm9yQ29ycmVjdExldmVsIiwiUVJNYXNrUGF0dGVybiIsImQiLCJnZXRCQ0hEaWdpdCIsIkcxNSIsIkcxNV9NQVNLIiwiRzE4IiwiZGlnaXQiLCJQQVRURVJOX1BPU0lUSU9OX1RBQkxFIiwiUEFUVEVSTjAwMCIsIlBBVFRFUk4wMDEiLCJQQVRURVJOMDEwIiwiUEFUVEVSTjAxMSIsIlBBVFRFUk4xMDAiLCJQQVRURVJOMTAxIiwiUEFUVEVSTjExMCIsIlBBVFRFUk4xMTEiLCJlcnJvckNvcnJlY3RMZW5ndGgiLCJhIiwibXVsdGlwbHkiLCJRUk1hdGgiLCJnZXhwIiwidHlwZSIsIk1PREVfTlVNQkVSIiwiTU9ERV9BTFBIQV9OVU0iLCJNT0RFX0tBTkpJIiwicXJDb2RlIiwiZ2V0TW9kdWxlQ291bnQiLCJzYW1lQ291bnQiLCJpc0RhcmsiLCJjb3VudCIsImRhcmtDb3VudCIsInJhdGlvIiwiYWJzIiwibiIsIkxPR19UQUJMRSIsIkVYUF9UQUJMRSIsIm51bSIsInNoaWZ0IiwidW5kZWZpbmVkIiwiZSIsImdsb2ciLCJSU19CTE9DS19UQUJMRSIsInJzQmxvY2siLCJnZXRSc0Jsb2NrVGFibGUiLCJsaXN0IiwiTCIsIk0iLCJRIiwiSCIsImJ1ZkluZGV4IiwiYml0IiwiZHJhd1FyY29kZSIsIm9wdGlvbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJjYW52YXNJZCIsIndhcm4iLCJjcmVhdGVDYW52YXMiLCJxcmNvZGUiLCJjb3JyZWN0TGV2ZWwiLCJhZGREYXRhIiwidGV4dCIsImN0eCIsInd4IiwiY3JlYXRlQ2FudmFzQ29udGV4dCIsInRpbGVXIiwid2lkdGgiLCJ0aWxlSCIsImhlaWdodCIsInN0eWxlIiwiZm9yZWdyb3VuZCIsImJhY2tncm91bmQiLCJzZXRGaWxsU3R5bGUiLCJ3IiwiY2VpbCIsImgiLCJmaWxsUmVjdCIsInJvdW5kIiwiZHJhdyJdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBb0JBLFNBQVNBLFVBQVQsQ0FBb0JDLElBQXBCLEVBQTBCO09BQ25CQyxJQUFMLEdBQVlDLE9BQU9DLGNBQW5CO09BQ0tILElBQUwsR0FBWUEsSUFBWjs7O0FBR0ZELFdBQVdLLFNBQVgsR0FBdUI7O2FBRVQsVUFBU0MsTUFBVCxF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
