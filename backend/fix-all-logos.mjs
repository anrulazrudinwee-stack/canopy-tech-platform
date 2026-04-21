/**
 * fix-all-logos.mjs
 * Replaces all Clearbit logo URLs in the DB with Simple Icons CDN.
 * Run: node fix-all-logos.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const LOGO_MAP = [
  { old: 'https://logo.clearbit.com/dell.com',        new: 'https://cdn.simpleicons.org/dell'                  },
  { old: 'https://logo.clearbit.com/hp.com',          new: 'https://cdn.simpleicons.org/hp'                    },
  { old: 'https://logo.clearbit.com/lenovo.com',      new: 'https://cdn.simpleicons.org/lenovo'                },
  { old: 'https://logo.clearbit.com/canon.com',       new: 'https://img.icons8.com/fluency/96/print.png'      },
  { old: 'https://cdn.simpleicons.org/canon',         new: 'https://img.icons8.com/fluency/96/print.png'      },
  { old: 'https://logo.clearbit.com/tp-link.com',     new: 'https://cdn.simpleicons.org/tplink'               },
  { old: 'https://logo.clearbit.com/synology.com',    new: 'https://cdn.simpleicons.org/synology'              },
  { old: 'https://logo.clearbit.com/microsoft.com',   new: 'https://img.icons8.com/color/96/microsoft.png'     },
  { old: 'https://logo.clearbit.com/acronis.com',     new: 'https://img.icons8.com/color/96/acronis.png'       },
  { old: 'https://logo.clearbit.com/crowdstrike.com', new: 'https://icon.horse/icon/crowdstrike.com'           },
  // Fix previously-set broken Simple Icons URLs
  { old: 'https://cdn.simpleicons.org/tp-link',       new: 'https://cdn.simpleicons.org/tplink'               },
  { old: 'https://cdn.simpleicons.org/microsoft',     new: 'https://img.icons8.com/color/96/microsoft.png'     },
  { old: 'https://cdn.simpleicons.org/acronis',       new: 'https://img.icons8.com/color/96/acronis.png'       },
  { old: 'https://cdn.simpleicons.org/crowdstrike',   new: 'https://icon.horse/icon/crowdstrike.com'           },
]

for (const { old: oldUrl, new: newUrl } of LOGO_MAP) {
  const { data, error } = await supabase
    .from('products')
    .update({ image_url: newUrl })
    .eq('image_url', oldUrl)
    .select('id')

  if (error) console.error(`✗ ${oldUrl}: ${error.message}`)
  else console.log(`✓ ${String(data.length).padStart(3)} products → ${newUrl}`)
}

// Fix PAX8 products with null or empty image_url
const SKU_PREFIX_LOGOS = [
  { prefix: 'MST', logo: 'https://img.icons8.com/color/96/microsoft.png'   },
  { prefix: 'ACR', logo: 'https://img.icons8.com/color/96/acronis.png'     },
  { prefix: 'CRW', logo: 'https://icon.horse/icon/crowdstrike.com'         },
  { prefix: 'CRD', logo: 'https://icon.horse/icon/crowdstrike.com'         },
  { prefix: 'CWD', logo: 'https://icon.horse/icon/crowdstrike.com'         },
]

for (const { prefix, logo } of SKU_PREFIX_LOGOS) {
  const { data, error } = await supabase
    .from('products')
    .update({ image_url: logo })
    .or('image_url.is.null,image_url.eq.')
    .like('sku', `${prefix}-%`)
    .select('id')

  if (error) console.error(`✗ ${prefix}: ${error.message}`)
  else if (data.length > 0) console.log(`✓ ${String(data.length).padStart(3)} ${prefix}- products fixed (was null/empty)`)
}

console.log('\nDone! Refresh your products page.')
