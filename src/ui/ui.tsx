import {
  Button,
  Container,
  IconWarning32,
  LoadingIndicator,
  render,
  Text,
  TextboxNumeric,
  VerticalSpace,
  Textbox
} from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback, useEffect, useState } from 'preact/hooks'

function Plugin() {
  const [token, setToken] = useState('')
  const [selectedImages, setSelectedImages] = useState([])
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressedImages, setCompressedImages] = useState([])
  const [error, setError] = useState(null)

  // Load token from storage when component mounts
  useEffect(() => {
    const savedToken = localStorage.getItem('tinypngToken')
    if (savedToken) {
      setToken(savedToken)
    }

    // Get selected images from the plugin
    window.onmessage = (event) => {
      const message = event.data.pluginMessage
      
      if (message.type === 'COMPRESSION_COMPLETE') {
        setCompressedImages(message.compressedImages)
        setIsCompressing(false)
      } else if (message.type === 'ERROR') {
        setError(message.message)
        setIsCompressing(false)
      } else if (message.type === 'SAVE_TO_DISK') {
        saveImagesToDisk(compressedImages)
      } else if (message.selectedImages) {
        setSelectedImages(message.selectedImages)
      }
    }
  }, [compressedImages])

  // Save token to storage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('tinypngToken', token)
    }
  }, [token])

  const handleTokenChange = useCallback((event) => {
    setToken(event.target.value)
  }, [])

  const handleCompress = useCallback(() => {
    if (!token) {
      setError('Please enter your TinyPNG API token')
      return
    }

    if (selectedImages.length === 0) {
      setError('Please select at least one image in Figma')
      return
    }

    setIsCompressing(true)
    setError(null)
    emit('COMPRESS_IMAGES', selectedImages, token)
  }, [token, selectedImages])

  const handleSave = useCallback(() => {
    if (compressedImages.length === 0) {
      setError('No compressed images to save')
      return
    }

    emit('SAVE_IMAGES')
  }, [compressedImages])

  const saveImagesToDisk = (images) => {
    // Create a temporary element to trigger the download
    for (const image of images) {
      const blob = new Blob([image.data], { type: 'image/png' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${image.name}.png`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleClose = useCallback(() => {
    emit('CLOSE_PLUGIN')
  }, [])

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>
        <h2>Save & Compress Images</h2>
      </Text>
      <VerticalSpace space="medium" />
      
      <Text>
        {selectedImages.length === 0 ? (
          <p>No images selected. Please select images in Figma.</p>
        ) : (
          <p>Selected {selectedImages.length} image(s) for compression.</p>
        )}
      </Text>
      <VerticalSpace space="medium" />
      
      <Text>TinyPNG Token</Text>
      <Textbox
        onValueInput={handleTokenChange}
        placeholder="Enter your TinyPNG API token"
        value={token}
        variant="border"
      />
      <VerticalSpace space="small" />
      <Text muted>
        <small>Your token will be saved for future use</small>
      </Text>
      <VerticalSpace space="medium" />
      
      {error && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', color: 'red' }}>
            <IconWarning32 />
            <Text>{error}</Text>
          </div>
          <VerticalSpace space="medium" />
        </>
      )}
      
      {isCompressing ? (
        <>
          <LoadingIndicator />
          <VerticalSpace space="small" />
          <Text align="center">Compressing images...</Text>
        </>
      ) : compressedImages.length > 0 ? (
        <>
          <Text>
            <p>Successfully compressed {compressedImages.length} image(s)!</p>
          </Text>
          <VerticalSpace space="medium" />
          <Button fullWidth onClick={handleSave}>Save Images</Button>
        </>
      ) : (
        <Button fullWidth onClick={handleCompress} disabled={selectedImages.length === 0 || !token}>
          Compress Images
        </Button>
      )}
      
      <VerticalSpace space="medium" />
      <Button fullWidth onClick={handleClose} secondary>
        Close Plugin
      </Button>
      <VerticalSpace space="medium" />
    </Container>
  )
}

export default render(Plugin)