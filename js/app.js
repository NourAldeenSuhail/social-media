(function () {
  "use strict";

  const API_BASE = "https://tarmeezacademy.com/api/v1";

  // === إدارة الجلسة ===
  function saveAuthData(user, token) {
    localStorage.setItem("tarmeez_user", JSON.stringify(user));
    localStorage.setItem("tarmeez_token", token);
  }

  function getAuthData() {
    const user = localStorage.getItem("tarmeez_user");
    const token = localStorage.getItem("tarmeez_token");
    return {
      user: user ? JSON.parse(user) : null,
      token: token || null,
    };
  }

  function clearAuthData() {
    localStorage.removeItem("tarmeez_user");
    localStorage.removeItem("tarmeez_token");
  }

  function getHeaders() {
    const token = getAuthData().token;
    const headers = { Accept: "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // === API Functions ===
  async function login(username, password) {
    const res = await axios.post(
      `${API_BASE}/login`,
      {
        username,
        password,
      },
      { headers: { Accept: "application/json" } }
    );
    return res.data;
  }

  async function register(name, username, email, password) {
    const res = await axios.post(
      `${API_BASE}/register`,
      {
        name,
        username,
        email,
        password,
      },
      { headers: { Accept: "application/json" } }
    );
    return res.data;
  }

  async function logout() {
    await axios.post(`${API_BASE}/logout`, {}, { headers: getHeaders() });
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
  const navAvatar = document.getElementById("navAvatar");
  const navUserName = document.getElementById("navUserName");

  let currentPage = 1;
  let loading = false;
  let hasMore = true;

  // === عرض المنشور ===
  function cleanImageUrl(url) {
    if (!url || typeof url !== "string")
      return "https://placehold.co/600x400/f0f4ff/4361ee?text=No+Image";
    return url.trim();
  }

  function renderPost(post) {
    const author = post.author || {};
    const avatarUrl =
      author.profile_image && typeof author.profile_image === "string"
        ? cleanImageUrl(author.profile_image)
        : `https://placehold.co/48x48/4361ee/white?text=${(author.name ||
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
      <img src="${imageUrl}" class="post-image" alt="Post image" onerror="this.src='https://placehold.co/600x400/f0f4ff/4361ee?text=Image+Error'">
      <div class="post-content">
        <h5 class="post-title">${post.title || "بدون عنوان"}</h5>
        <p class="post-body">${post.body || "لا يوجد وصف."}</p>
        <div class="divider"></div>
        <div class="tags">
          ${tagsHtml}
        </div>
        <div class="comments-count">
          <i class="bi bi-chat"></i> ${post.comments_count || 0} تعليقات
        </div>
      </div>
    `;
    return postEl;
  }

  // === تحديث واجهة المستخدم ===
  function updateUI() {
    const { user, token } = getAuthData();
    if (token && user) {
      authButtons.classList.add("d-none");
      userGreeting.classList.remove("d-none");

      navUserName.textContent = user.name || user.username;
      navAvatar.src =
        user.profile_image && typeof user.profile_image === "string"
          ? cleanImageUrl(user.profile_image)
          : `https://placehold.co/36x36/4361ee/white?text=${(user.name ||
              user.username ||
              "U")[0].toUpperCase()}`;
    } else {
      authButtons.classList.remove("d-none");
      userGreeting.classList.add("d-none");
    }
  }

  // === تحميل المنشورات ===
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
      if (currentPage === 1) {
        noMorePosts.textContent = "فشل تحميل المنشورات. حاول لاحقًا.";
        noMorePosts.classList.remove("d-none");
      }
    } finally {
      loading = false;
      loadingIndicator.classList.add("d-none");
    }
  }

  // === معالجة النماذج ===
  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorEl = document.getElementById("loginError");
    errorEl.classList.add("d-none");

    try {
      const response = await login(username, password);
      saveAuthData(response.user, response.token);
      updateUI();
      loadPosts(true);
      bootstrap.Modal.getInstance(document.getElementById("loginModal")).hide();
      document.getElementById("loginForm").reset();
    } catch (error) {
      if (error.response?.data?.message) {
        errorEl.textContent = error.response.data.message;
        errorEl.classList.remove("d-none");
      } else {
        errorEl.textContent = "فشل تسجيل الدخول. تحقق من بياناتك.";
        errorEl.classList.remove("d-none");
      }
    }
  });

  document
    .getElementById("registerForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("registerName").value.trim();
      const username = document.getElementById("registerUsername").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;
      const errorEl = document.getElementById("registerError");
      errorEl.classList.add("d-none");

      try {
        const response = await register(name, username, email, password);
        saveAuthData(response.user, response.token);
        updateUI();
        loadPosts(true);
        bootstrap.Modal.getInstance(
          document.getElementById("registerModal")
        ).hide();
        document.getElementById("registerForm").reset();
      } catch (error) {
        if (error.response?.data?.errors) {
          const errors = error.response.data.errors;
          let message = "";
          for (const field in errors) {
            message += `${errors[field][0]}\n`;
          }
          errorEl.textContent = message;
          errorEl.classList.remove("d-none");
        } else if (error.response?.data?.message) {
          errorEl.textContent = error.response.data.message;
          errorEl.classList.remove("d-none");
        } else {
          errorEl.textContent = "فشل إنشاء الحساب. حاول لاحقًا.";
          errorEl.classList.remove("d-none");
        }
      }
    });

  // === تسجيل الخروج ===
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await logout();
    } catch (error) {
      console.warn("فشل تسجيل الخروج من الخادم:", error);
    } finally {
      clearAuthData();
      updateUI();
    }
  });

  // === أحداث الأزرار ===
  document.getElementById("loginBtn").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("loginModal"));
    modal.show();
  });

  document.getElementById("registerBtn").addEventListener("click", () => {
    const modal = new bootstrap.Modal(document.getElementById("registerModal"));
    modal.show();
  });

  // === تمرير لا نهائي ===
  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 1000
    ) {
      loadPosts();
    }
  });

  // === تهيئة أولية ===
  updateUI();
  loadPosts();
})();
