export type HealthResponse = {
  ok: boolean;
  message: string;
};

export async function getHealth(baseUrl: string): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    return {
      ok: false,
      message: `Health request failed with status ${response.status}.`
    };
  }

  return response.json() as Promise<HealthResponse>;
}
