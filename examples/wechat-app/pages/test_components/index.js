import drawQrcode from '../../utils/weapp.qrcode.min.js'

Page({
  data: {
    isDraw: false
  },
  onLoad () {
  },
  draw: function () {
    this.setData({
      isDraw: true
    })
  }
})