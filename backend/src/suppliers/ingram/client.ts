import axios, { AxiosInstance } from 'axios'

interface IngramConfig {
  baseUrl: string
  clientId: string
  clientSecret: string
  grantType: string
}

interface AccessTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface ProductSearchResponse {
  products: IngramProduct[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalRecords: number
}

export interface IngramProduct {
  ingramPartNumber: string
  vendorPartNumber: string
  productName: string
  shortDescription: string
  longDescription: string
  category: string
  manufacturer: string
  unitPrice: number
  currencyCode: string
  stockAvailability: {
    quantityOnHand: number
    quantityAvailable: number
    warehouse: string
  }[]
  images?: Array<{
    imageUrl: string
    imageType: string
  }>
}

export class IngramMicroClient {
  private axiosInstance: AxiosInstance
  private config: IngramConfig
  private accessToken: string | null = null
  private tokenExpiry: number | null = null

  constructor(clientId: string, clientSecret: string, sandbox: boolean = true) {
    this.config = {
      baseUrl: sandbox
        ? 'https://api.ingrammicro.com/sandbox'
        : 'https://api.ingrammicro.com',
      clientId,
      clientSecret,
      grantType: 'client_credentials'
    }

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000
    })
  }

  /**
   * Get access token from Ingram Micro OAuth endpoint
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken
    }

    try {
      const response = await axios.post<AccessTokenResponse>(
        `${this.config.baseUrl}/oauth/oauth20/token`,
        null,
        {
          params: {
            grant_type: this.config.grantType,
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret
          }
        }
      )

      this.accessToken = response.data.access_token
      // Set expiry to 5 minutes before actual expiry
      this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000

      console.log('✓ Ingram Micro: Access token obtained')
      return this.accessToken
    } catch (error) {
      console.error('✗ Ingram Micro: Failed to get access token', error)
      throw new Error('Failed to authenticate with Ingram Micro API')
    }
  }

  /**
   * Search for products
   */
  async searchProducts(
    keyword: string,
    pageNumber: number = 0,
    pageSize: number = 100
  ): Promise<ProductSearchResponse> {
    const token = await this.getAccessToken()

    try {
      const response = await this.axiosInstance.get<ProductSearchResponse>(
        '/resellers/v7/products/search',
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            search: keyword,
            pageNumber,
            pageSize
          }
        }
      )

      return response.data
    } catch (error) {
      console.error(`✗ Ingram Micro: Product search failed for "${keyword}"`, error)
      throw error
    }
  }

  /**
   * Get price and availability for products
   */
  async getPriceAndAvailability(ingramPartNumbers: string[]): Promise<any> {
    const token = await this.getAccessToken()

    try {
      const response = await this.axiosInstance.post(
        '/resellers/v7/products/price-availability',
        {
          ingramPartNumbers
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      return response.data
    } catch (error) {
      console.error('✗ Ingram Micro: Price/availability fetch failed', error)
      throw error
    }
  }

  /**
   * Get product details
   */
  async getProductDetails(ingramPartNumber: string): Promise<IngramProduct> {
    const token = await this.getAccessToken()

    try {
      const response = await this.axiosInstance.get<IngramProduct>(
        `/resellers/v7/products/${ingramPartNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      return response.data
    } catch (error) {
      console.error(
        `✗ Ingram Micro: Failed to get details for ${ingramPartNumber}`,
        error
      )
      throw error
    }
  }

  /**
   * Search by category
   */
  async searchByCategory(
    category: string,
    pageNumber: number = 0,
    pageSize: number = 50
  ): Promise<ProductSearchResponse> {
    const token = await this.getAccessToken()

    try {
      const response = await this.axiosInstance.get<ProductSearchResponse>(
        '/resellers/v7/products/search',
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            category,
            pageNumber,
            pageSize
          }
        }
      )

      return response.data
    } catch (error) {
      console.error(`✗ Ingram Micro: Category search failed for "${category}"`, error)
      throw error
    }
  }
}