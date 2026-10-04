import { ApiService } from "./api-service.js";

const ORDER_STORAGE_KEY = "joice-portfolio-service-orders";
const MAX_STORED_ORDERS = 50;

class PortfolioApp {
  constructor() {
    this.state = {
      profile: null,
      projects: [],
      services: [],
    };

    this.elements = {
      projectList: document.querySelector("#projectList"),
      projectFilter: document.querySelector("#projectFilter"),
      projectModal: document.querySelector("#universalProjectModal"),
      projectModalTitle: document.querySelector("#projectModalTitle"),
      projectModalBody: document.querySelector("#projectModalBody"),
      skillsList: document.querySelector("#skillsList"),
      serviceList: document.querySelector("#serviceList"),
      serviceSelect: document.querySelector("#topik"),
      experienceBody: document.querySelector(".record tbody"),
      serviceForm: document.querySelector("#serviceForm"),
      submitButton: document.querySelector("#submitOrderButton"),
      orderCount: document.querySelector("#orderCountBadge"),
      toast: document.querySelector("#feedbackToast"),
      toastTitle: document.querySelector("#toastTitle"),
      toastMessage: document.querySelector("#toastMessage"),
    };
  }

  async init() {
    this.bindEvents();
    this.updateOrderCount();

    await Promise.all([
      this.loadProfile(),
      this.loadProjects(),
      this.loadServices(),
    ]);
  }

  bindEvents() {
    this.elements.projectFilter.addEventListener("change", () => {
      this.renderProjects(this.elements.projectFilter.value);
    });

    this.elements.projectList.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-project-id]");
      if (trigger) {
        this.openProjectModal(trigger.dataset.projectId);
      }
    });

    this.elements.serviceForm.addEventListener("submit", (event) => {
      this.handleServiceSubmit(event);
    });
  }

  // WEEK 4: Ambil data profil JSON dan isi elemen pada presentation shell.
  async loadProfile() {
    try {
      this.state.profile = await ApiService.getProfile();
      this.renderProfile(this.state.profile);
    } catch (error) {
      this.showRegionError("#profileLead", "Profil tidak dapat dimuat.", error);
    }
  }

  // WEEK 4: Ambil projects.json lalu jalankan filter, CSR, dan riwayat proyek.
  async loadProjects() {
    this.elements.projectList.setAttribute("aria-busy", "true");

    try {
      const projects = await ApiService.getProjects();
      if (!Array.isArray(projects)) {
        throw new Error("Format data proyek harus berupa array.");
      }

      this.state.projects = projects;
      this.renderFilterOptions(projects);
      this.renderProjects();
      this.renderExperience(projects);
    } catch (error) {
      console.error("[Projects provider error]", error);
      this.renderAlert(this.elements.projectList, "Proyek belum dapat dimuat. Periksa koneksi dan coba muat ulang halaman.");
      this.elements.projectList.setAttribute("aria-busy", "false");
      this.renderExperience([]);
    }
  }

  async loadServices() {
    try {
      const services = await ApiService.getServices();
      if (!Array.isArray(services)) {
        throw new Error("Format data layanan harus berupa array.");
      }

      this.state.services = services;
      this.renderServices(services);
    } catch (error) {
      console.error("[Services provider error]", error);
      this.renderAlert(this.elements.serviceList, "Katalog layanan belum dapat dimuat.");
    }
  }

  renderProfile(profile) {
    const lead = document.querySelector("#profileLead");

    lead.textContent = profile.lead;
    document.querySelector("#footerName").textContent = profile.name;
    document.querySelector("#footerTagline").textContent = profile.tagline;
    document.querySelector("#currentYear").textContent = new Date().getFullYear();
    document.querySelector("#profileCardName").textContent = profile.name;
    document.querySelector("#profileCardProgram").textContent = profile.program;
    document.querySelector("#profileCardInstitution").textContent = profile.institution;

    const profileEmail = document.querySelector("#profileCardEmail");
    profileEmail.href = `mailto:${profile.email}`;
    profileEmail.querySelector("span").textContent = profile.email;

    const initials = profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
    document.querySelector("#profileInitials").textContent = initials;

    const profilePhoto = document.querySelector("#profilePhoto");
    const photoFallback = document.querySelector("#profilePhotoFallback");
    const photoUrl = this.getSafeHttpUrl(profile.photo);
    if (photoUrl) {
      profilePhoto.alt = `Foto profil ${profile.name}`;
      profilePhoto.addEventListener("load", () => {
        profilePhoto.hidden = false;
        photoFallback.hidden = true;
      }, { once: true });
      profilePhoto.addEventListener("error", () => {
        profilePhoto.hidden = true;
        photoFallback.hidden = false;
      }, { once: true });
      profilePhoto.src = photoUrl;
    } else {
      photoFallback.hidden = false;
    }

    document.querySelectorAll(".brand-script").forEach((brand) => {
      brand.textContent = profile.name.split(/\s+/)[0];
    });
    document.querySelectorAll(".brand-subtitle").forEach((subtitle) => {
      subtitle.textContent = profile.program;
    });
    document.querySelector(".brand.navbar-brand").setAttribute("aria-label", `${profile.name}, kembali ke beranda`);

    this.renderSkills(profile.skills);
  }

  renderSkills(skills) {
    this.elements.skillsList.replaceChildren();

    if (!Array.isArray(skills) || skills.length === 0) {
      this.renderEmpty(this.elements.skillsList, "Belum ada informasi keahlian.");
      return;
    }

    skills.forEach((skill, index) => {
      const column = document.createElement("div");
      column.className = "col";

      const article = document.createElement("article");
      article.className = "skill-item h-100";

      const number = document.createElement("span");
      number.className = "skill-index";
      number.textContent = String(index + 1).padStart(2, "0");

      const title = document.createElement("h3");
      title.textContent = skill.title;

      const description = document.createElement("p");
      description.textContent = skill.description;

      article.append(number, title, description);
      column.append(article);
      this.elements.skillsList.append(column);
    });
  }

  renderFilterOptions(projects) {
    const categories = [...new Set(projects.map((project) => project.category).filter(Boolean))];
    this.elements.projectFilter.replaceChildren();
    this.appendOption(this.elements.projectFilter, "all", "Semua kategori");

    categories.forEach((category) => {
      this.appendOption(this.elements.projectFilter, category, category);
    });
  }

  // WEEK 4: Filter kategori dilakukan di client dari data yang sudah dimuat.
  renderProjects(category = this.elements.projectFilter.value || "all") {
    this.elements.projectList.replaceChildren();
    this.elements.projectList.setAttribute("aria-busy", "true");

    const projects = category === "all"
      ? this.state.projects
      : this.state.projects.filter((project) => project.category === category);

    if (projects.length === 0) {
      this.renderEmpty(this.elements.projectList, "Tidak ada proyek pada kategori ini.");
      this.elements.projectList.setAttribute("aria-busy", "false");
      return;
    }

    projects.forEach((project, index) => {
      this.elements.projectList.append(this.createProjectCard(project, index));
    });
    this.elements.projectList.setAttribute("aria-busy", "false");
  }

  // WEEK 4: Bangun kartu dinamis memakai DOM API dan textContent, bukan innerHTML.
  createProjectCard(project, index) {
    const column = document.createElement("div");
    column.className = "col project-column";

    const card = document.createElement("article");
    card.className = "card project-card h-100";

    const visual = document.createElement("div");
    visual.className = "project-visual card-img-top";

    const image = this.createSafeImage(project.image, project.title, "project-image");
    if (image) {
      image.addEventListener("error", () => {
        image.remove();
        visual.classList.add("project-visual-fallback");
      }, { once: true });
      visual.append(image);
    } else {
      visual.classList.add("project-visual-fallback");
    }

    const number = document.createElement("span");
    number.className = "project-number";
    number.textContent = String(index + 1).padStart(2, "0");

    visual.append(number);

    const body = document.createElement("div");
    body.className = "project-details card-body";

    const meta = document.createElement("p");
    meta.className = "project-year";
    meta.textContent = `${project.role} · ${project.year}`;

    const category = document.createElement("p");
    category.className = "project-eyebrow";
    category.textContent = project.category;

    const title = document.createElement("h3");
    title.className = "card-title";
    this.renderProjectTitle(title, project);

    const description = document.createElement("p");
    description.className = "card-text";
    description.textContent = project.description;

    const tags = document.createElement("div");
    tags.className = "project-tags d-flex flex-wrap gap-2";
    (Array.isArray(project.tags) ? project.tags : []).forEach((tag) => {
      const badge = document.createElement("span");
      badge.className = "badge project-tag";
      badge.textContent = tag;
      tags.append(badge);
    });

    const button = document.createElement("button");
    button.className = "btn btn-outline-dark btn-sm mt-auto project-detail-button";
    button.type = "button";
    button.dataset.projectId = project.id;
    button.textContent = "Lihat detail";
    button.setAttribute("aria-label", `Lihat detail ${project.title}`);

    body.append(meta, category, title, description, tags, button);
    card.append(visual, body);
    column.append(card);
    return column;
  }

  // WEEK 4: Isi satu modal universal dari project ID yang dipilih.
  openProjectModal(projectId) {
    const project = this.state.projects.find((item) => item.id === projectId);
    if (!project) return;

    this.renderProjectTitle(this.elements.projectModalTitle, project);
    this.elements.projectModalBody.replaceChildren();

    const image = this.createSafeImage(project.image, project.title, "img-fluid rounded project-modal-image");
    if (image) {
      image.addEventListener("error", () => image.remove(), { once: true });
      this.elements.projectModalBody.append(image);
    }

    const description = document.createElement("p");
    description.className = "modal-project-description mt-3";
    description.textContent = project.details || project.description;
    this.elements.projectModalBody.append(description);

    const tags = document.createElement("div");
    tags.className = "d-flex flex-wrap gap-2 mb-3";
    (Array.isArray(project.tags) ? project.tags : []).forEach((tag) => {
      const badge = document.createElement("span");
      badge.className = "badge project-tag";
      badge.textContent = tag;
      tags.append(badge);
    });
    this.elements.projectModalBody.append(tags);

    const metricsHeading = document.createElement("h3");
    metricsHeading.className = "h6";
    metricsHeading.textContent = "Kontribusi dan hasil";
    const metrics = document.createElement("ul");
    metrics.className = "project-metrics";
    (Array.isArray(project.metrics) ? project.metrics : []).forEach((metric) => {
      const item = document.createElement("li");
      item.textContent = metric;
      metrics.append(item);
    });
    this.elements.projectModalBody.append(metricsHeading, metrics);

    if (this.getSafeHttpUrl(project.link)) {
      const link = document.createElement("a");
      link.className = "btn btn-dark mt-3";
      link.href = this.getSafeHttpUrl(project.link);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Buka tautan proyek";
      this.elements.projectModalBody.append(link);
    }

    bootstrap.Modal.getOrCreateInstance(this.elements.projectModal).show();
  }

  renderServices(services) {
    this.elements.serviceList.replaceChildren();
    this.elements.serviceSelect.replaceChildren();
    this.appendOption(this.elements.serviceSelect, "", "Pilih paket layanan");

    if (services.length === 0) {
      this.renderEmpty(this.elements.serviceList, "Belum ada paket layanan.");
      return;
    }

    services.forEach((service) => {
      const column = document.createElement("div");
      column.className = "col";

      const card = document.createElement("article");
      card.className = "card service-card h-100";

      const body = document.createElement("div");
      body.className = "card-body d-flex flex-column";

      const category = document.createElement("p");
      category.className = "section-label";
      category.textContent = service.category;

      const title = document.createElement("h3");
      title.className = "card-title";
      title.textContent = service.title;

      const description = document.createElement("p");
      description.className = "card-text";
      description.textContent = service.description;

      const price = document.createElement("p");
      price.className = "service-price";
      price.textContent = service.priceLabel;

      const features = document.createElement("ul");
      features.className = "service-features";
      (Array.isArray(service.features) ? service.features : []).forEach((feature) => {
        const item = document.createElement("li");
        item.textContent = feature;
        features.append(item);
      });

      const choose = document.createElement("a");
      choose.className = "inline-link service-choose";
      choose.href = "#kontak";
      choose.textContent = "Pilih layanan";
      choose.addEventListener("click", () => {
        this.elements.serviceSelect.value = service.id;
      });

      body.append(category, title, description, features, price, choose);
      card.append(body);
      column.append(card);
      this.elements.serviceList.append(column);
      this.appendOption(this.elements.serviceSelect, service.id, `${service.title} - ${service.priceLabel}`);
    });
  }

  renderExperience(projects) {
    const rows = [...this.elements.experienceBody.querySelectorAll("tr")];
    rows.slice(1).forEach((row) => row.remove());
    document.querySelector("#experienceLoading")?.remove();

    projects.forEach((project) => {
      const row = document.createElement("tr");
      const year = document.createElement("th");
      year.scope = "row";
      year.textContent = project.year;

      const title = document.createElement("td");
      title.textContent = project.title;
      const role = document.createElement("td");
      role.textContent = project.role;
      const statusCell = document.createElement("td");
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = project.status;
      statusCell.append(status);

      row.append(year, title, role, statusCell);
      this.elements.experienceBody.append(row);
    });

    document.querySelector("#historyCount").textContent = String(projects.length + 1);
  }

  // WEEK 4: Validasi dan kirim DTO JSON melalui POST tanpa reload halaman.
  async handleServiceSubmit(event) {
    event.preventDefault();
    const form = this.elements.serviceForm;
    form.classList.add("was-validated");

    if (!form.checkValidity()) {
      form.querySelector(":invalid")?.focus();
      return;
    }

    const formData = new FormData(form);
    const values = Object.fromEntries(formData.entries());
    const service = this.state.services.find((item) => item.id === values.serviceId);
    const payload = {
      name: this.normalizeInput(values.nama, 120),
      email: this.normalizeInput(values.email, 254),
      phone: this.normalizeInput(values.telepon, 40),
      serviceId: service?.id || "",
      serviceName: service?.title || "",
      message: this.normalizeInput(values.pesan, 2000),
      createdAt: new Date().toISOString(),
    };

    if (!service) {
      this.showToast("Data layanan tidak tersedia", "Muat ulang halaman dan pilih paket yang tersedia.", false);
      return;
    }

    this.setSubmitState(true);
    try {
      const result = await ApiService.submitServiceOrder(payload);
      this.saveOrderHistory({
        id: result.id,
        name: payload.name,
        serviceId: payload.serviceId,
        serviceName: payload.serviceName,
        createdAt: payload.createdAt,
      });
      this.showToast("Permintaan berhasil dikirim", "Mock API menerima permintaan. Riwayat disimpan di browser ini.", true);
      form.reset();
      form.classList.remove("was-validated");
    } catch (error) {
      console.error("[Service order API error]", error);
      this.showToast("Permintaan belum terkirim", "Periksa koneksi lalu coba kembali. Tidak ada riwayat yang disimpan.", false);
    } finally {
      this.setSubmitState(false);
    }
  }

  setSubmitState(isSubmitting) {
    this.elements.submitButton.disabled = isSubmitting;
    this.elements.submitButton.replaceChildren();

    if (isSubmitting) {
      const spinner = document.createElement("span");
      spinner.className = "spinner-border spinner-border-sm me-2";
      spinner.setAttribute("aria-hidden", "true");
      this.elements.submitButton.append(spinner, document.createTextNode("Mengirim..."));
      return;
    }

    this.elements.submitButton.append("Kirim pesan ", document.createTextNode("↗"));
  }

  // WEEK 4: Persistensikan riwayat pesanan di localStorage dan update badge.
  saveOrderHistory(order) {
    const history = this.getOrderHistory();
    history.unshift(order);

    try {
      localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(history.slice(0, MAX_STORED_ORDERS)));
      this.updateOrderCount();
    } catch (error) {
      console.error("[localStorage error]", error);
      this.showToast("Pesanan terkirim", "API menerima pesanan, tetapi browser tidak dapat menyimpan riwayat lokal.", true);
    }
  }

  getOrderHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(ORDER_STORAGE_KEY) || "[]");
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  updateOrderCount() {
    this.elements.orderCount.textContent = String(this.getOrderHistory().length);
  }

  showToast(title, message, isSuccess) {
    this.elements.toastTitle.textContent = title;
    this.elements.toastMessage.textContent = message;
    this.elements.toast.classList.toggle("toast-success", isSuccess);
    this.elements.toast.classList.toggle("toast-error", !isSuccess);
    bootstrap.Toast.getOrCreateInstance(this.elements.toast, { delay: 5000 }).show();
  }

  renderEmpty(container, message) {
    const column = document.createElement("div");
    column.className = "col-12";
    const empty = document.createElement("div");
    empty.className = "empty-state text-center py-5";
    empty.textContent = message;
    column.append(empty);
    container.replaceChildren(column);
  }

  renderAlert(container, message) {
    const alert = document.createElement("div");
    alert.className = "alert alert-warning";
    alert.setAttribute("role", "alert");
    alert.textContent = message;
    container.replaceChildren(alert);
  }

  showRegionError(selector, message, error) {
    console.error("[Profile provider error]", error);
    const target = document.querySelector(selector);
    target.textContent = message;
    target.classList.add("text-danger");
  }

  appendOption(select, value, label) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }

  // WEEK 4: Terima hanya URL HTTP(S) sebelum membuat elemen gambar.
  createSafeImage(source, alt, className) {
    const url = this.getSafeHttpUrl(source);
    if (!url) return null;

    const image = document.createElement("img");
    image.src = url;
    image.alt = alt;
    image.className = className;
    image.loading = "lazy";
    image.decoding = "async";
    return image;
  }

  getSafeHttpUrl(value) {
    if (typeof value !== "string" || value.trim() === "") return "";

    try {
      const url = new URL(value, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  normalizeInput(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
  }

  renderProjectTitle(container, project) {
    container.replaceChildren();

    const lead = document.createElement("span");
    lead.className = "project-title-lead";
    lead.textContent = project.titleLead || project.title;
    container.append(lead);

    if (project.titleRest) {
      const rest = document.createElement("span");
      rest.className = "project-title-rest";
      rest.textContent = ` ${project.titleRest}`;
      container.append(rest);
    }
  }
}

const app = new PortfolioApp();
app.init();
