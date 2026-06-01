import crypto from 'crypto'

// V免签 PHP 支付 API 封装
// 文档参考: public/api.html

const PHP_API_BASE = process.env.PHP_API_BASE || 'http://localhost:8080'
const PHP_API_KEY = process.env.PHP_API_KEY || ''

interface CreateOrderParams {
  price: number
  type: 1 | 2 // 1=微信, 2=支付宝
  param?: string
  isHtml?: 0 | 1
}

interface CreateOrderResult {
  success: boolean
  orderId?: string
  payUrl?: string
  qrcodeUrl?: string
  message?: string
}

interface CheckOrderResult {
  success: boolean
  state: number // -1=未支付, 0=已支付, 1=已关闭
  price?: number
  reallyPrice?: number
  payDate?: number
}

function sign(payId: string, param: string, type: number, price: number): string {
  const raw = `${payId}${param}${type}${price}${PHP_API_KEY}`
  return crypto.createHash('md5').update(raw).digest('hex')
}

export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const payId = Date.now().toString()
  const param = params.param || 'ai_writing'
  const type = params.type
  const price = params.price
  const isHtml = params.isHtml ?? 1

  const signStr = sign(payId, param, type, price)

  const url = new URL(`${PHP_API_BASE}/createOrder`)
  url.searchParams.set('payId', payId)
  url.searchParams.set('type', type.toString())
  url.searchParams.set('price', price.toString())
  url.searchParams.set('sign', signStr)
  url.searchParams.set('param', param)
  url.searchParams.set('isHtml', isHtml.toString())

  try {
    const response = await fetch(url.toString())
    const text = await response.text()

    // 如果 isHtml=1，PHP 返回 HTML 支付页面
    // 如果 isHtml=0，返回 JSON
    if (isHtml === 1) {
      return {
        success: true,
        orderId: payId,
        payUrl: url.toString(),
      }
    }

    try {
      const json = JSON.parse(text)
      return {
        success: json.code === 1,
        orderId: payId,
        payUrl: json.pay_url || json.url,
        qrcodeUrl: json.qrcode,
        message: json.msg,
      }
    } catch {
      return { success: false, message: '支付接口返回格式异常' }
    }
  } catch (error) {
    return { success: false, message: `支付服务不可用: ${error}` }
  }
}

export async function checkOrder(orderId: string): Promise<CheckOrderResult> {
  const signStr = sign(orderId, '', 0, 0)

  const url = new URL(`${PHP_API_BASE}/checkOrder`)
  url.searchParams.set('payId', orderId)
  url.searchParams.set('sign', signStr)

  try {
    const response = await fetch(url.toString())
    const json = await response.json()

    return {
      success: json.code === 1,
      state: json.state ?? -1,
      price: json.price,
      reallyPrice: json.reallyPrice,
      payDate: json.payDate,
    }
  } catch {
    return { success: false, state: -1 }
  }
}

export async function getOrderState(orderId: string) {
  return checkOrder(orderId)
}
