"use client"

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  Lock, 
  Key, 
  Info, 
  AlertCircle, 
  CheckCircle2
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (apiKey: string) => void
  serviceName?: string
}

// Key for storing in localStorage - using a non-obvious name
const STORAGE_KEY = 'gutenberg_explorer_secure_credentials'

export function ApiKeyModal({
  isOpen,
  onClose,
  onSubmit,
  serviceName = 'Groq AI'
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [rememberKey, setRememberKey] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [keyFound, setKeyFound] = useState(false)

  // Check if we have a stored key on component mount
  useEffect(() => {
    if (!isOpen) return

    // Try to load the key from storage
    try {
      const storedData = localStorage.getItem(STORAGE_KEY)
      if (storedData) {
        const decryptedData = decryptData(storedData)
        const parsedData = JSON.parse(decryptedData)
        
        // If the key exists for this service
        if (parsedData && parsedData[getServiceKey(serviceName)]) {
          setApiKey(parsedData[getServiceKey(serviceName)])
          setKeyFound(true)
        }
      }
    } catch (err) {
      console.error('Error loading stored API key:', err)
      // If there's an error, we'll just prompt for the key again
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [isOpen, serviceName])

  // Basic validation function for API keys
  const validateApiKey = (key: string): boolean => {
    // This is a simple validation - adjust based on the actual API key format
    return key.trim().length >= 8
  }

  // Handle key submission
  const handleSubmit = async () => {
    setError(null)
    
    if (!validateApiKey(apiKey)) {
      setError('Please enter a valid API key')
      return
    }

    setIsValidating(true)
    
    try {
      // If you want to validate the key works before saving
      // For now, we'll just assume it's valid
      // const isValid = await testApiKey(apiKey)

      // Store the key if rememberKey is checked
      if (rememberKey) {
        storeApiKey(apiKey, serviceName)
      }

      // Call the onSubmit callback
      onSubmit(apiKey)
      onClose()
    } catch (err) {
      setError('Failed to validate API key. Please check and try again.')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-800 ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            {keyFound ? 'Confirm API Key' : `Enter Your ${serviceName} API Key`}
          </DialogTitle>
          <DialogDescription>
            We need your API key to analyze text. {keyFound ? 'We found a saved key. Please confirm it\'s correct.' : ''}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-1">
              <Lock className="h-4 w-4" /> API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key here"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setKeyFound(false) // Reset the found flag when user edits
              }}
              autoComplete="off"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rememberKey"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="rememberKey" className="text-sm text-gray-600">
              Remember my API key on this device
            </Label>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your API key is stored only on your device. We never transmit or store your key on our servers.
              API calls are made directly from your browser to {serviceName}.
            </AlertDescription>
          </Alert>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isValidating || !apiKey.trim()}
            className="gap-2"
          >
            {isValidating ? (
              <>
                <span className="animate-spin">⟳</span>
                Validating...
              </>
            ) : keyFound ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Confirm Key
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper functions for secure storage

// Simple function to convert service name to a key
function getServiceKey(serviceName: string): string {
  return serviceName.toLowerCase().replace(/\s+/g, '_')
}

// Basic encryption/decryption functions
// Note: This is not high-security encryption, but it provides basic obfuscation
// For truly sensitive data, consider more robust solutions

function encryptData(data: string): string {
  // Basic XOR encryption with a random key
  const key = Math.floor(Math.random() * 256)
  const encrypted = Array.from(data).map(char => 
    String.fromCharCode(char.charCodeAt(0) ^ key)
  ).join('')
  
  // Store the key as the first character (as a char code)
  return String.fromCharCode(key) + encrypted
}

function decryptData(encryptedData: string): string {
  // Extract the key from the first character
  const key = encryptedData.charCodeAt(0)
  
  // Decrypt the rest of the string
  return Array.from(encryptedData.slice(1)).map(char =>
    String.fromCharCode(char.charCodeAt(0) ^ key)
  ).join('')
}

function storeApiKey(apiKey: string, serviceName: string): void {
  try {
    // Get existing stored data
    const storedData = localStorage.getItem(STORAGE_KEY)
    let data = {}
    
    if (storedData) {
      // Decrypt and parse existing data
      const decryptedData = decryptData(storedData)
      data = JSON.parse(decryptedData)
    }
    
    // Update with the new key
    data = {
      ...data,
      [getServiceKey(serviceName)]: apiKey
    }
    
    // Encrypt and store
    const encryptedData = encryptData(JSON.stringify(data))
    localStorage.setItem(STORAGE_KEY, encryptedData)
  } catch (err) {
    console.error('Error storing API key:', err)
  }
}

export function getStoredApiKey(serviceName: string): string | null {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (!storedData) return null
    
    const decryptedData = decryptData(storedData)
    const data = JSON.parse(decryptedData)
    
    return data[getServiceKey(serviceName)] || null
  } catch (err) {
    console.error('Error retrieving API key:', err)
    return null
  }
}

export function clearStoredApiKey(serviceName: string): void {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (!storedData) return
    
    const decryptedData = decryptData(storedData)
    const data = JSON.parse(decryptedData)
    
    // Remove the key for this service
    delete data[getServiceKey(serviceName)]
    
    // If there are still other keys, update storage
    if (Object.keys(data).length > 0) {
      const encryptedData = encryptData(JSON.stringify(data))
      localStorage.setItem(STORAGE_KEY, encryptedData)
    } else {
      // Otherwise, remove the item entirely
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch (err) {
    console.error('Error clearing API key:', err)
  }
}