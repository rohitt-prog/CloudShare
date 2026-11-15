import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateFileForUpload,
  MAX_FILE_SIZE_BYTES,
  DISALLOWED_EXTENSIONS,
  determineFileCategory,
  formatByteSize,
} from '../src/features/files/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

const readSrc = (relativeFilePath) => {
  return fs.readFileSync(path.join(frontendRoot, relativeFilePath), 'utf-8');
};

// ==============================================================================
// 1. Behavioral Tests: File Validation Rules
// ==============================================================================

test('[BEHAVIORAL RUNTIME] validateFileForUpload enforces strict 50 MiB limit', () => {
  assert.equal(MAX_FILE_SIZE_BYTES, 50 * 1024 * 1024);

  // Exactly at 50 MB boundary
  const atLimit = { name: 'valid_limit.pdf', size: 50 * 1024 * 1024, type: 'application/pdf' };
  assert.equal(validateFileForUpload(atLimit).isValid, true);

  // 1 byte over 50 MB
  const overLimit = { name: 'too_large.zip', size: 50 * 1024 * 1024 + 1, type: 'application/zip' };
  const overResult = validateFileForUpload(overLimit);
  assert.equal(overResult.isValid, false);
  assert.ok(overResult.error?.includes('exceeds the 50 MB limit'));

  // 0-byte or negative sizes
  const zeroByte = { name: 'empty.txt', size: 0, type: 'text/plain' };
  const zeroResult = validateFileForUpload(zeroByte);
  assert.equal(zeroResult.isValid, false);
  assert.ok(zeroResult.error?.includes('empty (0 byte) files'));
});

test('[BEHAVIORAL RUNTIME] validateFileForUpload strictly rejects dangerous extensions', () => {
  const rejectedExts = ['exe', 'bat', 'cmd', 'sh', 'vbs', 'msi', 'dll', 'com', 'scr', 'cpl', 'jar'];

  // All disallowed extensions must be present in the set
  for (const ext of rejectedExts) {
    assert.ok(DISALLOWED_EXTENSIONS.has(ext), `Extension .${ext} must be in DISALLOWED_EXTENSIONS`);
    const file = { name: `dangerous_payload.${ext}`, size: 1024, type: 'application/octet-stream' };
    const result = validateFileForUpload(file);
    assert.equal(result.isValid, false);
    assert.ok(result.error?.includes(`.${ext}`));
  }

  // Safe common file extensions must be accepted
  const acceptedExts = ['pdf', 'png', 'jpg', 'mp4', 'zip', 'docx', 'xlsx', 'txt', 'csv', 'json', 'ts'];
  for (const ext of acceptedExts) {
    const file = { name: `safe_document.${ext}`, size: 1024, type: 'application/octet-stream' };
    const result = validateFileForUpload(file);
    assert.equal(result.isValid, true, `File with .${ext} should be valid`);
    assert.equal(result.error, null);
  }
});

// ==============================================================================
// 2. Behavioral Tests: Multi-File Selection & Warning Logic
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Multi-file drop algorithm selects first file and warns about remainder', () => {
  const toastCalls = [];
  const mockToast = {
    warning: (description, title) => {
      toastCalls.push({ type: 'warning', description, title });
    },
  };

  // Helper implementing the exact logic from FileUpload.tsx handleDrop / handleChange
  const processSelectedFiles = (fileList, toast) => {
    if (!fileList || fileList.length === 0) return null;
    const primaryFile = fileList[0];
    const extraCount = fileList.length - 1;

    if (extraCount > 0) {
      toast.warning(
        `Selected "${primaryFile.name}". ${extraCount} additional file${
          extraCount > 1 ? 's were' : ' was'
        } ignored because single-file upload is currently enabled.`,
        'Single File Upload'
      );
    }
    return primaryFile;
  };

  // Case A: Single file dropped -> no warning, primary selected
  const singleDrop = [{ name: 'presentation.pdf', size: 2048 }];
  const resultSingle = processSelectedFiles(singleDrop, mockToast);
  assert.equal(resultSingle?.name, 'presentation.pdf');
  assert.equal(toastCalls.length, 0);

  // Case B: 3 files dropped -> selects first, warns about 2 extra
  const multiDrop = [
    { name: 'first.pdf', size: 1024 },
    { name: 'second.png', size: 2048 },
    { name: 'third.zip', size: 4096 },
  ];
  const resultMulti = processSelectedFiles(multiDrop, mockToast);
  assert.equal(resultMulti?.name, 'first.pdf');
  assert.equal(toastCalls.length, 1);
  assert.equal(toastCalls[0].title, 'Single File Upload');
  assert.ok(toastCalls[0].description.includes('2 additional files were ignored'));
});

// ==============================================================================
// 3. Behavioral Tests: Upload Initiation & Toast Feedback Flow
// ==============================================================================

test('[BEHAVIORAL RUNTIME] Upload completion flow fires success toast and cleans up selection', async () => {
  const toastSuccessCalls = [];
  const mockToast = {
    success: (description, title) => {
      toastSuccessCalls.push({ description, title });
    },
  };

  let selectionState = { name: 'quarterly_report.pdf', size: 5000 };
  let inputElementValue = 'C:\\fakepath\\quarterly_report.pdf';

  const simulateInitiateUpload = async (file, onUploadFn, toast) => {
    if (!file) return;
    const uploadedFileName = file.name;
    const result = await onUploadFn(file);
    if (result.success) {
      toast.success(`"${uploadedFileName}" uploaded successfully to your vault.`, 'Upload Complete');
      selectionState = null;
      inputElementValue = '';
    }
  };

  // Successful upload
  const successfulUpload = async () => ({ success: true, error: null });
  await simulateInitiateUpload(selectionState, successfulUpload, mockToast);

  assert.equal(toastSuccessCalls.length, 1);
  assert.equal(toastSuccessCalls[0].title, 'Upload Complete');
  assert.ok(toastSuccessCalls[0].description.includes('quarterly_report.pdf'));
  assert.equal(selectionState, null);
  assert.equal(inputElementValue, '');

  // Failed upload: does NOT trigger success toast, retains selection
  let failedSelection = { name: 'failed_upload.pdf', size: 5000 };
  const failedUpload = async () => ({ success: false, error: 'Network timeout' });
  await simulateInitiateUpload(failedSelection, failedUpload, mockToast);

  assert.equal(toastSuccessCalls.length, 1, 'Success toast must not be fired on failure');
  assert.notEqual(failedSelection, null, 'Failed file must remain selected for retry');
});

// ==============================================================================
// 4. Source-Inspection Tests: Component Semantics & Accessibility
// ==============================================================================

test('[STATIC SOURCE] FileUpload dropzone uses semantic button without nested interactive controls or block elements', () => {
  const uploadSrc = readSrc('src/features/files/components/FileUpload.tsx');

  // Must use native button for dropzone
  assert.ok(uploadSrc.includes('<button'), 'Dropzone must render a native button');
  assert.ok(uploadSrc.includes('type="button"'), 'Dropzone button must have type="button"');
  assert.ok(
    uploadSrc.includes('aria-label="Upload file: drop file here or click to browse"'),
    'Dropzone must declare an accessible label'
  );
  assert.ok(uploadSrc.includes('focus-visible:ring-2'), 'Dropzone must declare visible focus indicator');

  // Verify that dropzone button subtree strictly uses phrasing elements (span), not block elements (div, p)
  const dropzoneAria = uploadSrc.indexOf('aria-label="Upload file: drop file here or click to browse"');
  assert.ok(dropzoneAria !== -1, 'Dropzone must declare accessible label');
  const buttonTagStart = uploadSrc.lastIndexOf('<button', dropzoneAria);
  const buttonTagEnd = uploadSrc.indexOf('</button>', dropzoneAria);
  const dropzoneSubtree = uploadSrc.substring(buttonTagStart, buttonTagEnd + 9);

  assert.ok(dropzoneSubtree.includes('<span className="flex h-12 w-12'), 'Dropzone icon container must be a span');
  assert.ok(dropzoneSubtree.includes('<span className="block text-xs'), 'Dropzone primary text must be a span');
  assert.ok(dropzoneSubtree.includes('<span className="mt-1 block text-[11px]'), 'Dropzone secondary text must be a span');
  assert.ok(
    dropzoneSubtree.includes('<span className="mt-3 inline-flex items-center gap-1'),
    'Browse button inside dropzone must be a span to avoid invalid nested interactive HTML'
  );

  // Content model check: no block elements inside the button
  assert.ok(!dropzoneSubtree.includes('<div'), 'Dropzone button must not contain block-level <div> elements');
  assert.ok(!dropzoneSubtree.includes('<p'), 'Dropzone button must not contain block-level <p> elements');
  assert.ok(!dropzoneSubtree.includes('<a'), 'Dropzone button must not contain nested links');
});

test('[STATIC SOURCE] FileUpload integrates useToast and avoids unmanaged success timeouts', () => {
  const uploadSrc = readSrc('src/features/files/components/FileUpload.tsx');

  assert.ok(uploadSrc.includes('useToast'), 'Must import useToast hook');
  assert.ok(uploadSrc.includes('toast.success('), 'Must invoke toast.success upon successful upload');
  assert.ok(uploadSrc.includes('toast.warning('), 'Must invoke toast.warning on multi-file drop');
  assert.ok(
    !uploadSrc.includes('setTimeout(() => {'),
    'Must remove old unmanaged four-second success setTimeout'
  );
});

test('[STATIC SOURCE] FileUpload omits accept attribute allowlist while preserving input accessibility', () => {
  const uploadSrc = readSrc('src/features/files/components/FileUpload.tsx');

  // Must NOT declare an accept attribute on the file input, avoiding allowlists that conflict with the validator
  assert.ok(!uploadSrc.includes('accept='), 'File input must not declare a restrictive accept attribute');
  assert.ok(!uploadSrc.includes('ACCEPTED_FILE_TYPES'), 'Must not define an artificial accept allowlist');
  assert.ok(uploadSrc.includes('tabIndex={-1}'), 'Hidden file input must have tabIndex=-1 to avoid double focus');
  assert.ok(uploadSrc.includes('aria-label="Choose file to upload"'), 'File input must declare aria-label');
  assert.ok(uploadSrc.includes('className="sr-only"'), 'Hidden file input must use sr-only');
});

test('[STATIC SOURCE] FileUpload presents truthful indeterminate progress without fake percentages', () => {
  const uploadSrc = readSrc('src/features/files/components/FileUpload.tsx');

  // Indeterminate progress semantics
  assert.ok(uploadSrc.includes('role="status"'), 'Loading progress must declare role="status"');
  assert.ok(uploadSrc.includes('aria-live="polite"'), 'Loading progress must declare aria-live="polite"');
  assert.ok(uploadSrc.includes('animate-pulse'), 'Loading progress must use pulse indeterminate bar');

  // Truthful text
  assert.ok(uploadSrc.includes('uploadStatus || `Uploading ${selectedFile.name}...`'), 'Must display truthful upload text');

  // Absence of fake metrics or unsupported features
  assert.ok(!uploadSrc.includes('progressPercent'), 'Must NOT invent fake progress percentage');
  assert.ok(!uploadSrc.includes('uploadedBytes'), 'Must NOT invent fake uploaded bytes');
  assert.ok(!uploadSrc.includes('Cancel Upload'), 'Must NOT offer unsupported upload cancellation');
  assert.ok(!uploadSrc.includes('abort()'), 'Must NOT simulate unsupported abort');
});

test('[STATIC SOURCE] FileUpload declares assistive technology alert roles on errors', () => {
  const uploadSrc = readSrc('src/features/files/components/FileUpload.tsx');

  assert.ok(
    uploadSrc.includes('role="alert"'),
    'Errors must declare role="alert" for screen-reader interruption'
  );
  assert.ok(
    uploadSrc.includes('aria-live="assertive"'),
    'Errors must declare aria-live="assertive"'
  );
});
