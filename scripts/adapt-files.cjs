const fs = require('fs')
const path = require('path')

const srcDir = 'c:/Users/Debajoyti/Documents/the-food-garden/src'
const destDir = 'C:/Users/Debajoyti/Documents/shanti-kutir/src'

function adaptFile(relPath, customReplacer) {
  let content = fs.readFileSync(path.join(srcDir, relPath), 'utf8')
  // adapt storage keys
  content = content.replace(/tfg_/g, 'sk_')
  content = content.replace(/The Food Garden/g, 'Shanti Kutir')
  content = content.replace(/the-food-garden/g, 'shanti-kutir')
  content = content.replace(/Nandakumar · NH-116B/g, 'Tamluk-Nandakumar · NH-116')
  
  if (customReplacer) {
    content = customReplacer(content)
  }
  fs.writeFileSync(path.join(destDir, relPath), content, 'utf8')
  console.log('Adapted ' + relPath)
}

adaptFile('components/CustomerNotificationBanner.tsx', (content) => {
  // Remove emojis and replace with SVG or clean text
  return content.replace(/['"]🎁['"]/g, "''").replace(/['"]📢['"]/g, "''").replace(/['"]✨['"]/g, "''")
})

adaptFile('pages/Profile.tsx', (content) => {
  return content
})

adaptFile('pages/rider/RiderView.tsx', (content) => {
  return content
})

console.log('Finished updating 3 files with authentic UTF-8')
