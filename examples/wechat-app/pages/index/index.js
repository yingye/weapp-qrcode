import drawQrcode from '../../utils/weapp.qrcode.min.js'

Page({
  data: {
    text: 'https://m.baidu.com',
    inputValue: ''
  },
  onLoad () {
    this.draw()
  },
  changeText (text) {
    if (!this.data.inputValue) {
      wx.showModal({
        title: '提示',
        content: '请先输入要转换的内容！',
        showCancel: false
      })
      return
    }
    this.setData({
      text: this.data.inputValue
    })
    this.draw()
  },
  bindKeyInput (e) {
    this.setData({
      inputValue: e.detail.value
    })
  },
  draw () {
    drawQrcode({
      width: 200,
      height: 200,
      canvasId: 'myQrcode',
      typeNumber: 10,
      text: this.data.text,
      callback(e) {
        console.log('e: ', e)
      }
    })
  }
})