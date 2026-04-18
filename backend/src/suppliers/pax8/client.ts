import axios, { AxiosInstance } from 'axios'

const PAX8_AUTH_URL = 'https://login.pax8.com/oauth/token'
const PAX8_API_BASE = 'https://api.pax8.com/v1'
const USD_TO_SGD = 1.35

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

export interface Pax8Product {
  id: string
  name: string
  sku: string
  vendor: string
  vendorSku: string
  description: string
  requiresCommitment: boolean
}

export interface Pax8PricingTier {
  billingTerm: string
  commitmentTerm?: string
  type: string
  rates: {
    partnerBuyRate: number
    suggestedRetailPrice: number
    startQuantityRange: number
    chargeType: string
  }[]
}

export class Pax8Client {
  private http: AxiosInstance
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor(
    private clientId: string,
    private clientSecret: string
  ) {
    this.http = axios.create({ baseURL: PAX8_API_BASE, timeout: 30000 })
  }

  async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    const res = await axios.post<TokenResponse>(
      PAX8_AUTH_URL,
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: 'api://p8p.client',
        grant_type: 'client_credentials',
      },
      { headers: { 'Content-Type': 'application/json' } }
    )

    this.accessToken = res.data.access_token
    this.tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000
    console.log('  ✓ PAX8 token obtained')
    return this.accessToken
  }

  private async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const token = await this.getToken()
    const res = await this.http.get<T>(path, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })
    return res.data
  }

  /** Fetch all products matching search params, auto-paginating */
  async listProducts(params: { productName?: string; vendorName?: string }): Promise<Pax8Product[]> {
    const results: Pax8Product[] = []
    let page = 0
    const size = 100

    while (true) {
      const data = await this.get<any>('/products', { ...params, page, size })
      const items: Pax8Product[] = data.content ?? []
      results.push(...items)
      if (data.last || items.length === 0) break
      page++
    }

    return results
  }

  /** Fetch pricing tiers for a product UUID */
  async getProductPricing(productId: string): Promise<Pax8PricingTier[]> {
    const data = await this.get<any>(`/products/${productId}/pricing`)
    return data.content ?? []
  }

  /** Pick the best monthly SRP and partner buy rate from pricing tiers */
  static extractMonthlyPrice(tiers: Pax8PricingTier[]): { srpUsd: number; buyUsd: number } {
    const preferred =
      tiers.find(t => t.billingTerm === 'Monthly' && t.commitmentTerm === '1-Year') ||
      tiers.find(t => t.billingTerm === 'Monthly' && !t.commitmentTerm) ||
      tiers.find(t => t.billingTerm !== 'Trial' && (t.rates?.[0]?.suggestedRetailPrice ?? 0) > 0)

    if (!preferred) return { srpUsd: 0, buyUsd: 0 }

    const rate = preferred.rates?.[0]
    return {
      srpUsd: rate?.suggestedRetailPrice ?? 0,
      buyUsd: rate?.partnerBuyRate ?? 0,
    }
  }

  static toSgd(usd: number): number {
    return Math.round(usd * USD_TO_SGD * 100) / 100
  }
}
