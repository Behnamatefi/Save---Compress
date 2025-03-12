import { once, showUI } from '@create-figma-plugin/utilities'

export default function () {
  const options = {
    width: 320,
    height: 480
  }

  showUI(options, { 
    selectedImages: getSelectedImages() 
  })

  once('COMPRESS_IMAGES', async function (imageData, token) {
    try {
      // Compress images using TinyPNG API
      const compressedImages = await compressImages(imageData, token)
      
      // Notify UI that compression is complete
      figma.ui.postMessage({
        type: 'COMPRESSION_COMPLETE',
        compressedImages
      })
    } catch (error) {
      figma.ui.postMessage({
        type: 'ERROR',
        message: error.message
      })
    }
  })

  once('SAVE_IMAGES', function () {
    // This will trigger the OS file picker
    figma.ui.postMessage({
      type: 'SAVE_TO_DISK'
    })
  })

  once('CLOSE_PLUGIN', function () {
    figma.closePlugin()
  })
}

// Get selected images from Figma
function getSelectedImages() {
  const selectedNodes = figma.currentPage.selection
  const imageNodes = selectedNodes.filter(node => 
    node.type === 'RECTANGLE' && node.fills.some(fill => fill.type === 'IMAGE')
  )

  return imageNodes.map(node => ({
    id: node.id,
    name: node.name
  }))
}

// Compress images using TinyPNG API
async function compressImages(imageData, token) {
  const compressedImages = []

  for (const image of imageData) {
    try {
      // Export the image as a PNG
      const node = figma.getNodeById(image.id)
      if (!node || node.type !== 'RECTANGLE') continue

      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: { type: 'SCALE', value: 1 }
      })

      // Send to TinyPNG API
      const compressedImage = await sendToTinyPNG(bytes, token)
      compressedImages.push({
        name: image.name,
        data: compressedImage
      })
    } catch (error) {
      console.error(`Error compressing image ${image.name}:`, error)
    }
  }

  return compressedImages
}

// Send image to TinyPNG API
async function sendToTinyPNG(imageBytes, token) {
  const auth = 'Basic ' + btoa('api:' + token)
  
  // First request to upload and compress
  const uploadResponse = await fetch('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/octet-stream'
    },
    body: imageBytes
  })

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json()
    throw new Error(error.message || 'Error compressing image')
  }

  const { output } = await uploadResponse.json()
  
  // Second request to download the compressed image
  const downloadResponse = await fetch(output.url, {
    headers: {
      'Authorization': auth
    }
  })

  if (!downloadResponse.ok) {
    throw new Error('Error downloading compressed image')
  }

  // Return the compressed image data
  return await downloadResponse.arrayBuffer()
}