(function () {
  "use strict";

  const API_BASE = "https://tarmeezacademy.com/api/v1";
  let AUTH_TOKEN = null;

  function setAuthToken(token) {
    AUTH_TOKEN = token;
  }
  function getAuthToken() {
    return AUTH_TOKEN;
  }
  function clearAuthToken() {
    AUTH_TOKEN = null;
  }

  function getHeaders() {
    const headers = { Accept: "application/json" };
    if (AUTH_TOKEN) {
      headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
    }
    return headers;
  }

  // === API Functions ===
  async function login(email, password) {
    const res = await axios.post(
      `${API_BASE}/login`,
      { email, password },
      { headers: { Accept: "application/json" } }
    );
    return res.data;
  }

  async function register(name, email, password) {
    const res = await axios.post(
      `${API_BASE}/register`,
      { name, email, password },
      { headers: { Accept: "application/json" } }
    );
    return res.data;
  }

  async function fetchPosts(page = 1, limit = 10) {
    const res = await axios.get(`${API_BASE}/posts`, {
      headers: getHeaders(),
      params: { page, limit },
    });
    return res.data;
  }

  // === DOM Elements ===
  const postsContainer = document.getElementById("postsContainer");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const noMorePosts = document.getElementById("noMorePosts");
  const authButtons = document.getElementById("authButtons");
  const userGreeting = document.getElementById("userGreeting");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");

  let currentPage = 1;
  let loading = false;
  let hasMore = true;

  // === Helper Functions ===
  function cleanImageUrl(url) {
    if (!url) return "https://placehold.co/600x400/e9ecef/6c757d?text=No+Image";
    if (typeof url === "string") {
      return url.trim();
    }
    return "https://placehold.co/600x400/e9ecef/6c757d?text=No+Image";
  }

  function renderPost(post) {
    const author = post.author || {};
    const avatarUrl =
      author.profile_image && typeof author.profile_image === "string"
        ? author.profile_image.trim()
        : `https://placehold.co/44x44/0d6efd/white?text=${(author.name ||
            "U")[0].toUpperCase()}`;

    const imageUrl = cleanImageUrl(post.image);

    const tagsHtml =
      (post.tags || [])
        .map(
          (tag) =>
            `<span class="tag">#${
              typeof tag === "string" ? tag : tag.name || tag.id || "tag"
            }</span>`
        )
        .join(" ") || "";

    const postEl = document.createElement("div");
    postEl.className = "card post-card";
    postEl.innerHTML = `
      <div class="post-header d-flex align-items-center p-3">
        <img src="${avatarUrl}" class="avatar" alt="Avatar">
        <div>
          <div class="fw-bold">${author.name || "مستخدم مجهول"}</div>
          <div class="post-meta">${post.created_at || "الآن"}</div>
        </div>
      </div>
      <img src="${imageUrl}" class="post-image" alt="Post image" onerror="this.src='https://placehold.co/600x400/e9ecef/6c757d?text=Image+Error'">
      <div class="post-content">
        <h5 class="post-title">${post.title || "بدون عنوان"}</h5>
        <p class="post-body">${post.body || "لا يوجد وصف."}</p>
        <div class="divider"></div>
        <div class="tags">
          ${tagsHtml}
        </div>
        <div class="comments-count">
          <i class="bi bi-chat ms-1"></i> ${post.comments_count || 0} تعليقات
        </div>
      </div>
    `;
    return postEl;
  }

  function updateUI() {
    const token = getAuthToken();
    if (token) {
      authButtons.classList.add("d-none");
      userGreeting.classList.remove("d-none");
      userGreeting.innerHTML = `<span class="me-3">مرحباً!</span><button class="btn btn-outline-secondary" id="logoutBtn">تسجيل الخروج</button>`;
      document
        .getElementById("logoutBtn")
        .addEventListener("click", handleLogout);
    } else {
      authButtons.classList.remove("d-none");
      userGreeting.classList.add("d-none");
    }
  }

  async function handleLogout() {
    clearAuthToken();
    updateUI();
  }

  async function loadPosts(reset = false) {
    if (loading || (!hasMore && !reset)) return;

    if (reset) {
      postsContainer.innerHTML = "";
      currentPage = 1;
      hasMore = true;
    }

    loading = true;
    loadingIndicator.classList.remove("d-none");

    try {
      const data = await fetchPosts(currentPage, 10);
      const posts = data.data || [];
      const meta = data.meta || {};

      if (posts.length === 0 && currentPage === 1) {
        noMorePosts.textContent = "لا توجد منشورات متاحة.";
        noMorePosts.classList.remove("d-none");
        return;
      }

      posts.forEach((post) => {
        const postElement = renderPost(post);
        postsContainer.appendChild(postElement);
      });

      currentPage++;
      if (meta.current_page >= meta.last_page) {
        hasMore = false;
        if (currentPage > 2) {
          noMorePosts.classList.remove("d-none");
        }
      }
    } catch (error) {
      console.error("خطأ في تحميل المنشورات:", error);
      if (reset && error.response?.status === 401) {
        alert("الجلسة منتهية. سيتم عرض المنشورات العامة.");
        clearAuthToken();
        updateUI();
      } else {
        alert("فشل تحميل المنشورات. قد يكون الخادم غير متاح.");
      }
    } finally {
      loading = false;
      loadingIndicator.classList.add("d-none");
    }
  }

  async function handleLogin() {
    const email = prompt("البريد الإلكتروني:");
    const password = prompt("كلمة المرور:");
    if (!email || !password) return;

    try {
      const response = await login(email, password);
      const token = response.access_token;
      if (token) {
        setAuthToken(token);
        updateUI();
        await loadPosts(true);
      } else {
        alert("فشل تسجيل الدخول.");
      }
    } catch (error) {
      alert("فشل تسجيل الدخول. تحقق من بريدك وكلمة المرور.");
    }
  }

  async function handleRegister() {
    const name = prompt("الاسم الكامل:");
    const email = prompt("البريد الإلكتروني:");
    const password = prompt("كلمة المرور (6+ أحرف):");
    if (!name || !email || !password) return;

    try {
      await register(name, email, password);
      alert("تم إنشاء الحساب! يرجى تسجيل الدخول.");
    } catch (error) {
      alert("فشل التسجيل. قد يكون البريد مستخدمًا.");
    }
  }

  // === Event Listeners ===
  if (loginBtn) loginBtn.addEventListener("click", handleLogin);
  if (registerBtn) registerBtn.addEventListener("click", handleRegister);

  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 1000
    ) {
      loadPosts();
    }
  });

  // === Initial Load ===
  updateUI();
  loadPosts(); // جلب أول 10 منشورات فورًا
})();
