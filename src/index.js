import {
  QRCode,
  QRErrorCorrectLevel
} from './qrcode'

function drawQrcode(options) {

  options = options || {}
  options = Object.assign({
    width: 256,
    height: 256,
    typeNumber: -1,
    correctLevel: QRErrorCorrectLevel.H,
    background: '#ffffff',
    foreground: '#000000',
    callback(res) {}
  }, options)

  if (!options.canvasId) {
    console.warn('please you set canvasId!')
    return
  }

  createCanvas()

  async function createCanvas() {

    // create the qrcode itself
    var qrcode = new QRCode(options.typeNumber, options.correctLevel)
    qrcode.addData(options.text)
    qrcode.make()

    // get canvas context
    var ctx = wx.createCanvasContext && wx.createCanvasContext(options.canvasId)

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
        ctx.fillRect(Math.round(col * tileW), Math.round(row * tileH), w, h)
      }
    }
    ctx.draw(false, function (e) {
      options.callback(ctx)
    })

  }
}

export default drawQrcode
