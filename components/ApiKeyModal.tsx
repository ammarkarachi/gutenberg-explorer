'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, Key, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (apiKey: string) => void;
  serviceName?: string;
}

const STORAGE_KEY = 'gutenberg_explorer_secure_credentials';

export function ApiKeyModal({
  isOpen,
  onClose,
  onSubmit,
  serviceName = 'Groq AI',
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rememberKey, setRememberKey] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [keyFound, setKeyFound] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const decryptedData = decryptData(storedData);
        const parsedData = JSON.parse(decryptedData);

        if (parsedData && parsedData[getServiceKey(serviceName)]) {
          setApiKey(parsedData[getServiceKey(serviceName)]);
          setKeyFound(true);
        }
      }
    } catch (err) {
      console.error('Error loading stored API key:', err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isOpen, serviceName]);

  const validateApiKey = (key: string): boolean => {
    return key.trim().length >= 8;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!validateApiKey(apiKey)) {
      setError('Please enter a valid API key');
      return;
    }

    setIsValidating(true);

    try {
      if (rememberKey) {
        storeApiKey(apiKey, serviceName);
      }

      onSubmit(apiKey);
      onClose();
    } catch (err) {
      console.error('Error validating API key:', err);
      setError('Failed to validate API key. Please check and try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-slate-800 ">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            {keyFound ? 'Confirm API Key' : `Enter Your ${serviceName} API Key`}
          </DialogTitle>
          <DialogDescription>
            We need your API key to analyze text.{' '}
            {keyFound
              ? "We found a saved key. Please confirm it's correct."
              : ''}
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
                setApiKey(e.target.value);
                setKeyFound(false);
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
              Your API key is stored only on your device. We never transmit or
              store your key on our servers. API calls are made directly from
              your browser to {serviceName}.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
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
  );
}

function getServiceKey(serviceName: string): string {
  return serviceName.toLowerCase().replace(/\s+/g, '_');
}

function encryptData(data: string): string {
  const key = Math.floor(Math.random() * 256);
  const encrypted = Array.from(data)
    .map((char) => String.fromCharCode(char.charCodeAt(0) ^ key))
    .join('');

  return String.fromCharCode(key) + encrypted;
}

function decryptData(encryptedData: string): string {
  const key = encryptedData.charCodeAt(0);

  return Array.from(encryptedData.slice(1))
    .map((char) => String.fromCharCode(char.charCodeAt(0) ^ key))
    .join('');
}

function storeApiKey(apiKey: string, serviceName: string): void {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    let data = {};

    if (storedData) {
      const decryptedData = decryptData(storedData);
      data = JSON.parse(decryptedData);
    }

    data = {
      ...data,
      [getServiceKey(serviceName)]: apiKey,
    };

    const encryptedData = encryptData(JSON.stringify(data));
    localStorage.setItem(STORAGE_KEY, encryptedData);
  } catch (err) {
    console.error('Error storing API key:', err);
  }
}

export function getStoredApiKey(serviceName: string): string | null {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return null;

    const decryptedData = decryptData(storedData);
    const data = JSON.parse(decryptedData);

    return data[getServiceKey(serviceName)] || null;
  } catch (err) {
    console.error('Error retrieving API key:', err);
    return null;
  }
}

export function clearStoredApiKey(serviceName: string): void {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return;

    const decryptedData = decryptData(storedData);
    const data = JSON.parse(decryptedData);

    delete data[getServiceKey(serviceName)];

    if (Object.keys(data).length > 0) {
      const encryptedData = encryptData(JSON.stringify(data));
      localStorage.setItem(STORAGE_KEY, encryptedData);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('Error clearing API key:', err);
  }
}
