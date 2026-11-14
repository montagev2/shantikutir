const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../src/pages/rider/RiderView.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// Fix advanceAmount
content = content.replace(/o\.advanceAmount/g, '(o.advanceAmount || 0)')
content = content.replace(/otpModalOrder\.advanceAmount/g, '(otpModalOrder.advanceAmount || 0)')
content = content.replace(/cashConfirmOrder\.advanceAmount/g, '(cashConfirmOrder.advanceAmount || 0)')

// Fix createdAt date parsing
content = content.replace(/new Date\(o\.createdAt\)/g, 'new Date(o.createdAt || o.created_at || Date.now())')

// Fix formatOrderId(o.id)
content = content.replace(/formatOrderId\(o\.id\)/g, 'formatOrderId(o.id || "")')

// Fix Nandakumar address fallback
content = content.replace(/Nandakumar, Purba Medinipur, West Bengal 721648/g, 'Tamluk-Nandakumar Road, Purba Medinipur, West Bengal')

// Fix productId in items
content = content.replace(/i\.productId/g, '(i.productId || (i as any).product_id || "")')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Fixed RiderView.tsx')
