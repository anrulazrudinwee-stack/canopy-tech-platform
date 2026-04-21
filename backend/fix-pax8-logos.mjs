/**
 * fix-pax8-logos.mjs
 * One-time: updates PAX8 product image_url from Clearbit to Simple Icons CDN.
 * Run: node fix-pax8-logos.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const LOGO_MAP = [
  { old: 'https://logo.clearbit.com/microsoft.com',   new: 'https://img.icons8.com/color/96/microsoft.png'   },
  { old: 'https://logo.clearbit.com/acronis.com',     new: 'https://img.icons8.com/color/96/acronis.png'     },
  { old: 'https://logo.clearbit.com/crowdstrike.com', new: 'https://icon.horse/icon/crowdstrike.com'         },
  { old: 'https://cdn.simpleicons.org/microsoft',     new: 'https://img.icons8.com/color/96/microsoft.png'   },
  { old: 'https://cdn.simpleicons.org/acronis',       new: 'https://img.icons8.com/color/96/acronis.png'     },
  { old: 'https://cdn.simpleicons.org/crowdstrike',   new: 'https://icon.horse/icon/crowdstrike.com'         },
]

for (const { old: oldUrl, new: newUrl } of LOGO_MAP) {
  const { data, error } = await supabase
    .from('products')
    .update({ image_url: newUrl })
    .eq('image_url', oldUrl)
    .select('id')

  if (error) console.error(`✗ ${oldUrl}: ${error.message}`)
  else console.log(`✓ Updated ${data.length} products: ${oldUrl.split('/').pop()} → simpleicons`)
}

// Fix PAX8 products with null/empty image_url using SKU prefix
const SKU_LOGOS = [
  { prefix: 'MST', logo: 'https://img.icons8.com/color/96/microsoft.png'   },
  { prefix: 'ACR', logo: 'https://img.icons8.com/color/96/acronis.png'     },
  { prefix: 'CRW', logo: 'https://icon.horse/icon/crowdstrike.com'         },
  { prefix: 'CRD', logo: 'https://icon.horse/icon/crowdstrike.com'         },
  { prefix: 'CWD', logo: 'https://icon.horse/icon/crowdstrike.com'         },
]

for (const { prefix, logo } of SKU_LOGOS) {
  const { data, error } = await supabase
    .from('products')
    .update({ image_url: logo })
    .or('image_url.is.null,image_url.eq.')
    .like('sku', `${prefix}-%`)
    .select('id')

  if (error) console.error(`✗ ${prefix}: ${error.message}`)
  else if (data.length > 0) console.log(`✓ Fixed ${data.length} ${prefix}- products with missing logo`)
}

console.log('\nDone!')
