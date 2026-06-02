import crypto from 'crypto'

// V免签 PHP 支付 API 封装
// API文档: public/api.html

const PHP_API_BASE = (process.env.PHP_API_BASE || 'http://localhost:8080').replace(/\/$/, '')
const PHP_API_KEY = process.env.PHP_API_KEY || ''

/** 本站域名 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
}

/** V免签异步通知地址 */
export function getNotifyUrl(): string {
  return `${getSiteUrl()}/api/payment/callback`
}

// ---- 类型 ----

interface CreateOrderParams {
  price: number
  type: 1 | 2 // 1=微信, 2=支付宝
  param?: string
  notifyUrl?: string
}

export interface CreateOrderResult {
  success: boolean
  /** V免签云端订单号（用于查询状态） */
  orderId?: string
  /** 商户订单号 */
  payId?: string
  /** V免签支付页面URL（前端新窗口打开） */
  payPageUrl?: string
  /** 原始支付链接（二维码内容） */
  payUrl?: string
  /** 实际支付金额 */
  reallyPrice?: number
  /** 0=已固定金额, 1=需手动输金额 */
  isAuto?: number
  message?: string
}

interface CheckOrderResult {
  /** true=已支付, false=未支付/失败 */
  paid: boolean
  /** V免签原始 code: 1=已付, -1=未付 */
  code: number
  msg?: string
}

// ---- 签名 ----

function makeSign(payId: string, param: string, type: number, price: number): string {
  const raw = `${payId}${param}${type}${price}${PHP_API_KEY}`
  return crypto.createHash('md5').update(raw).digest('hex')
}

/** 验证回调签名（回调含 reallyPrice，与下单签名不同） */
export function verifyCallbackSign(
  payId: string, param: string, type: string | number,
  price: string | number, reallyPrice: string | number, incomingSign: string
): boolean {
  const raw = `${payId}${param}${type}${price}${reallyPrice}${PHP_API_KEY}`
  const expected = crypto.createHash('md5').update(raw).digest('hex')
  return expected === incomingSign
}

// ---- API ----

/** 创建支付订单，返回订单信息和支付页面URL */
export async function createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const payId = Date.now().toString()
  const param = params.param || 'ai_writing'
  const type = params.type
  const price = params.price
  const signStr = makeSign(payId, param, type, price)

  const url = new URL(`${PHP_API_BASE}/createOrder`)
  url.searchParams.set('payId', payId)
  url.searchParams.set('type', type.toString())
  url.searchParams.set('price', price.toString())
  url.searchParams.set('sign', signStr)
  url.searchParams.set('param', param)
  url.searchParams.set('isHtml', '0') // 返回JSON，不走V免签页面跳转
  if (params.notifyUrl) {
    url.searchParams.set('notifyUrl', params.notifyUrl)
  }

  try {
    const response = await fetch(url.toString())
    const text = await response.text()

    try {
      const json = JSON.parse(text)
      if (json.code === 1 && json.data) {
        const d = json.data
        return {
          success: true,
          orderId: d.orderId,
          payId: d.payId || payId,
          // V免签支付页面（带QR码）
          payPageUrl: `${PHP_API_BASE}/payPage/pay.html?orderId=${d.orderId}`,
          payUrl: d.payUrl,
          reallyPrice: parseFloat(d.reallyPrice) || price,
          isAuto: d.isAuto ?? 1,
          message: json.msg,
        }
      }
      return { success: false, message: json.msg || '创建订单失败' }
    } catch {
      return { success: false, message: '支付接口返回格式异常' }
    }
  } catch (error) {
    return { success: false, message: `支付服务不可用: ${error}` }
  }
}

/** 查询订单是否已支付 */
export async function checkOrder(orderId: string): Promise<CheckOrderResult> {
  const url = new URL(`${PHP_API_BASE}/checkOrder`)
  url.searchParams.set('orderId', orderId)

  try {
    const response = await fetch(url.toString())
    const json = await response.json()
    // V免签 checkOrder: code=1 已支付, code=-1 未支付/过期
    return {
      paid: json.code === 1,
      code: json.code ?? -1,
      msg: json.msg || '',
    }
  } catch {
    return { paid: false, code: -1, msg: '查询失败' }
  }
}
