export class HttpError extends Error {
  responseJSON: unknown;
  constructor(status: number, responseJSON: unknown) {
    super(`HTTP Error ${status}`);
    this.responseJSON = responseJSON;
  }
}

export async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  return response.arrayBuffer();
}

export async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new HttpError(response.status, body);
  }
  return response.json() as Promise<T>;
}

export async function sendFile<T>(url: string, file: File | Blob): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: file,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new HttpError(response.status, body);
  }
  return response.json() as Promise<T>;
}

export async function sendJSON<T>(url: string, data: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new HttpError(response.status, body);
  }
  return response.json() as Promise<T>;
}
