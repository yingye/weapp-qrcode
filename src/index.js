import extend from 'extend'
import {
  QRCode,
  QRErrorCorrectLevel
} from './qrcode'

// support Chinese
function utf16to8 (str) {
  var out, i, len, c
  out = ''
  len = str.length
  for (i = 0; i < len; i++) {
    c = str.charCodeAt(i)
    if ((c >= 0x0001) && (c <= 0x007F)) {
      out += str.charAt(i)
    } else if (c > 0x07FF) {
      out += String.fromCharCode(0xE0 | ((c >> 12) & 0x0F))
      out += String.fromCharCode(0x80 | ((c >> 6) & 0x3F))
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F))
    } else {
      out += String.fromCharCode(0xC0 | ((c >> 6) & 0x1F))
      out += String.fromCharCode(0x80 | ((c >> 0) & 0x3F))
    }
  }
  return out
}

function drawQrcode (options) {
  options = options || {}
  options = extend(true, {
    width: 256,
    height: 256,
    x: 0,
    y: 0,
    typeNumber: -1,
    correctLevel: QRErrorCorrectLevel.H,
    background: '#ffffff',
    foreground: '#000000',
    image: {
      imageResource: '',
      dx: 0,
      dy: 0,
      dWidth: 100,
      dHeight: 100
    }
  }, options)

  if (!options.canvasId && !options.ctx) {
    console.warn('please set canvasId or ctx!')
    return
  }

  createCanvas()

  function createCanvas () {
    // create the qrcode itself
    var qrcode = new QRCode(options.typeNumber, options.correctLevel)
    qrcode.addData(utf16to8(options.text))
    qrcode.make()

    // get canvas context
    var ctx
    if (options.ctx) {
      ctx = options.ctx
    } else {
      ctx = options._this ? wx.createCanvasContext && wx.createCanvasContext(options.canvasId, options._this) : wx.createCanvasContext && wx.createCanvasContext(options.canvasId)
    }

    // compute tileW/tileH based on options.width/options.height
    var tileW = options.width / qrcode.getModuleCount()
    var tileH = options.height / qrcode.getModuleCount()

    // draw in the canvas
    for (var row = 0; row < qrcode.getModuleCount(); row++) {
      for (var col = 0; col < qrcode.getModuleCount(); col++) {
        var style = qrcode.isDark(row, col) ? options.foreground : options.background
        ctx.setFillStyle(style)
        var w = (Math.ceil((col + 1) * tileW) - Math.floor(col * tileW))
        var h = (Math.ceil((row + 1) * tileW) - Math.floor(row * tileW))
        ctx.fillRect(Math.round(col * tileW) + options.x, Math.round(row * tileH) + options.y, w, h)
      }
    }

    if (options.image.imageResource) {
      ctx.save()
      if (options.image.radius && options.image.radius > 0) {
        // draw radius
        drawRRect(ctx, options.image.dx, options.image.dy, options.image.dWidth, options.image.dHeight, options.image.radius)
        ctx.clip()
      }
      ctx.drawImage(options.image.imageResource, options.image.dx, options.image.dy, options.image.dWidth, options.image.dHeight)
      ctx.restore()
    }

    ctx.draw(false, function (e) {
      options.callback && options.callback(e)
    })
  }
}

function drawRRect (ctx, x = 0, y = 0, width = 0, height = 0, radius = 0) {
  if (width < 2 * radius) {
    radius = width / 2
  }
  if (height < 2 * radius) {
    radius = height / 2
  }
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

export default drawQrcode
