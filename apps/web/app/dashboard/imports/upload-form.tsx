'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label } from '@null/ui';
import { ImportResultCard, type UploadResult } from './import-result-card';

async function readUploadResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as UploadResult & { error?: string };
  }

  const text = (await response.text()).trim();
  return {
    ok: response.ok,
    error: text || `Upload failed with status ${response.status}.`
  } as UploadResult & { error?: string };
}

function toUploadErrorMessage(uploadError: unknown) {
  if (uploadError instanceof TypeError) {
    return 'The upload request did not complete. Check the server logs or browser network panel for the failed /api/imports/upload request.';
  }

  if (uploadError instanceof Error) {
    return uploadError.message;
  }

  return 'Upload failed.';
}

export function UploadForm({
  organizationId,
  providers,
  loadError
}: {
  organizationId: string | null;
  providers: Array<{ id: string; slug: string; name: string }>;
  loadError?: string | null;
}) {
  const router = useRouter();
  const [providerSlug, setProviderSlug] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const validationMessage = useMemo(() => {
    if (loadError) {
      return loadError;
    }
    if (!organizationId) {
      return 'No organization is available for uploads yet.';
    }
    if (providers.length === 0) {
      return 'No source providers are available for this organization yet.';
    }
    if (!providerSlug) {
      return 'Select a provider.';
    }
    if (!file) {
      return 'Choose a CSV file.';
    }
    return null;
  }, [file, loadError, organizationId, providerSlug, providers.length]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (validationMessage || !organizationId || !file) {
      setError(validationMessage ?? 'Upload is not ready yet.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.set('organizationId', organizationId);
    formData.set('providerSlug', providerSlug);
    formData.set('file', file);

    try {
      const response = await fetch('/api/imports/upload', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json'
        },
        body: formData
      });
      const payload = await readUploadResponse(response);

      if (!response.ok) {
        throw new Error(payload.error ?? 'Upload failed.');
      }

      setResult(payload);
      setFile(null);
      setProviderSlug('');
      const fileInput = document.getElementById('import-file-input') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
      router.refresh();
    } catch (uploadError) {
      setError(toUploadErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="analytics-panel">
      <div className="page-header" style={{ marginBottom: '1rem' }}>
        <h2>Upload provider CSV</h2>
        <p>CSV only for now. Convert Goodreads Excel files to CSV before uploading.</p>
      </div>

      <form className="analytics-form" onSubmit={handleSubmit}>
        <div className="analytics-form__row">
          <div>
            <Label htmlFor="provider-select">Provider</Label>
            <select
              id="provider-select"
              className="null-ui-input"
              value={providerSlug}
              onChange={(event) => setProviderSlug(event.target.value)}
              disabled={isUploading || providers.length === 0 || Boolean(loadError)}
            >
              <option value="">Select provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.slug}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="import-file-input">File</Label>
            <Input
              id="import-file-input"
              type="file"
              accept=".csv,.xlsx,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              disabled={isUploading || Boolean(loadError)}
            />
          </div>
        </div>

        <p className="analytics-table__muted" style={{ margin: 0 }}>
          Supported in V1: CSV uploads for Goodreads and Amazon/Kindle charts. XLSX uploads show a convert-to-CSV message.
        </p>

        {error ? <p style={{ color: 'var(--error)', margin: 0 }}>{error}</p> : null}
        {!error && validationMessage ? <p style={{ margin: 0 }}>{validationMessage}</p> : null}

        <div className="analytics-actions">
          <Button type="submit" disabled={isUploading || Boolean(validationMessage)}>
            {isUploading ? 'Uploading…' : 'Stage import'}
          </Button>
        </div>
      </form>

      <ImportResultCard result={result} />
    </section>
  );
}
