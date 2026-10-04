// WEEK 4 DATA ACCESS LAYER: JSON providers are fetched separately from the UI.
const DATA_URLS = {
  profile: new URL("../data/profile.json", import.meta.url),
  projects: new URL("../data/projects.json", import.meta.url),
  services: new URL("../data/services.json", import.meta.url),
};

// WEEK 4 REST DISPATCH: Public mock endpoint for demonstrating asynchronous POST.
const MOCK_ORDER_ENDPOINT = "https://jsonplaceholder.typicode.com/posts";

// WEEK 4: Shared fetch helper with network, HTTP, and JSON error handling.
async function fetchJson(url) {
  let response;

  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch (error) {
    throw new Error(`Tidak dapat menghubungi penyedia data: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Penyedia data mengembalikan JSON yang tidak valid.");
  }
}

export const ApiService = {
  getProfile() {
    return fetchJson(DATA_URLS.profile);
  },

  getProjects() {
    return fetchJson(DATA_URLS.projects);
  },

  getServices() {
    return fetchJson(DATA_URLS.services);
  },

  // WEEK 4: Serialize the service order DTO and send it without a page reload.
  async submitServiceOrder(payload) {
    let response;

    try {
      response = await fetch(MOCK_ORDER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=UTF-8" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      throw new Error(`Pengiriman gagal: ${error.message}`);
    }

    if (!response.ok) {
      throw new Error(`API menolak pesanan (HTTP ${response.status}).`);
    }

    return response.json();
  },
};
