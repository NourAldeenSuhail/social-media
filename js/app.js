(function () {
  "use strict";

  // ==============================
  // 1. الإعدادات الأساسية
  // ==============================
  const API_BASE = "https://tarmeezacademy.com/api/v1";

  // ==============================
  // 2. إدارة الجلسة (Token + User)
  // ==============================
  function saveAuthData(user, token) {
    localStorage.setItem("tarmeez_user", JSON.stringify(user));
    localStorage.setItem("tarmeez_token", token);
  }
  // حدث إضافة تعليق
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

  // ==============================
  // 3. واجهات الـ API
  // ==============================
  async function login(username, password) {
    const res = await axios.post(`${API_BASE}/login`, { username, password });
    return res.data;
  }

  async function register(name, username, email, password) {
    const res = await axios.post(`${API_BASE}/register`, {
      name,
      username,
      email,
      password,
    });
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

  async function fetchTags() {
    try {
      const res = await axios.get(`${API_BASE}/tags`, {
        headers: getHeaders(),
      });
      return res.data.data || [];
    } catch (error) {
      return [];
    }
  }

  async function createPost(title, body, imageFile, tags) {
    const formData = new FormData();
    if (title) formData.append("title", title);
    formData.append("body", body);
    if (imageFile) formData.append("image", imageFile);
    if (tags?.length) {
      tags.forEach((tag) => formData.append("tags[]", tag));
    }

    const res = await axios.post(`${API_BASE}/posts`, formData, {
      headers: {
        ...getHeaders(),
      },
    });
    return res.data;
  }
  async function fetchComments(postId) {
    const res = await axios.get(`${API_BASE}/posts/${postId}/comments`, {
      headers: getHeaders(),
    });
    return res.data;
  }

  async function addComment(postId, body) {
    const res = await axios.post(
      `${API_BASE}/posts/${postId}/comments`,
      { body },
      { headers: getHeaders() }
    );
    return res.data;
  }

  // === تعديل منشور ===
  async function updatePost(postId, title, body, imageFile, tags) {
    const formData = new FormData();
    if (title !== undefined) formData.append("title", title);
    if (body !== undefined) formData.append("body", body);
    if (imageFile) formData.append("image", imageFile);
    if (tags?.length) {
      tags.forEach((tag) => formData.append("tags[]", tag));
    }

    const res = await axios.post(`${API_BASE}/posts/${postId}`, formData, {
      headers: getHeaders(),
      params: { _method: "PUT" }, // Laravel يدعم PUT عبر POST مع _method
    });
    return res.data;
  }

  // === حذف منشور ===
  async function deletePost(postId) {
    await axios.delete(`${API_BASE}/posts/${postId}`, {
      headers: getHeaders(),
    });
  }

  // ==============================
  // 4. دوال العرض (UI Rendering)
  // ==============================
  function cleanImageUrl(url) {
    if (!url || typeof url !== "string") return "";
    return url.trim();
  }

  function renderPost(post) {
    const author = post.author || {};
    const displayName = author.name || author.username || "مستخدم مجهول";
    const avatarUrl =
      cleanImageUrl(author.profile_image) ||
      `https://placehold.co/48x48/4361ee/white?text=${displayName
        .charAt(0)
        .toUpperCase()}`;

    const imageUrl = cleanImageUrl(post.image);
    const tagsHtml =
      (post.tags || [])
        .map((tag) => {
          const tagName = tag.arabic_name || tag.name || "تاغ";
          return `<span class="tag">#${tagName}</span>`;
        })
        .join(" ") || "";

    // تحقق مما إذا كان المنشور ملكًا للمستخدم الحالي
    const { user } = getAuthData();
    const isOwner = user && post.author && post.author.id === user.id;

    // أزرار التعديل/الحذف (تظهر فقط للمنشورات الخاصة بك)
    const actionsHtml = isOwner
      ? `
    <div class="d-flex justify-content-end gap-2 mt-2">
      <button class="btn btn-sm btn-outline-primary edit-post-btn" data-post-id="${post.id}">
        <i class="bi bi-pencil"></i> تعديل
      </button>
      <button class="btn btn-sm btn-outline-danger delete-post-btn" data-post-id="${post.id}">
        <i class="bi bi-trash"></i> حذف
      </button>
    </div>
  `
      : "";

    const postEl = document.createElement("div");
    postEl.className = "card post-card";
    postEl.innerHTML = `
    <div class="post-header d-flex align-items-center p-3">
      <img src="${avatarUrl}" class="avatar" alt="Avatar" 
           onerror="this.src='https://placehold.co/48x48/4361ee/white?text=${displayName
             .charAt(0)
             .toUpperCase()}'">
      <div>
        <div class="fw-bold">${displayName}</div>
        <div class="post-meta">${post.created_at || "الآن"}</div>
      </div>
    </div>
    ${
      imageUrl
        ? `<img src="${imageUrl}" class="post-image" alt="Post image" 
                   onerror="this.src='https://placehold.co/600x400/f0f4ff/4361ee?text=Image+Error'">`
        : ""
    }
    <div class="post-content">
      <h5 class="post-title">${post.title || "بدون عنوان"}</h5>
      <p class="post-body">${post.body || "لا يوجد وصف."}</p>
      <div class="divider"></div>
      <div class="tags">${tagsHtml}</div>
      <div class="comments-count"><i class="bi bi-chat"></i> ${
        post.comments_count || 0
      } 
      تعليقات</div>
      <button class="btn btn-sm btn-outline-secondary view-details-btn" data-post-id="${
        post.id
      }">
        عرض التفاصيل
      </button>
      ${actionsHtml}
    </div>
  `;

    // احفظ بيانات المنشور في العنصر لاستخدامها لاحقًا في التعديل
    postEl.dataset.postData = JSON.stringify(post);

    return postEl;
  }

  function renderComment(comment) {
    const author = comment.author || {};
    const displayName = author.name || author.username || "مستخدم";
    const avatarUrl =
      cleanImageUrl(author.profile_image) ||
      `https://placehold.co/32x32/4361ee/white?text=${displayName
        .charAt(0)
        .toUpperCase()}`;

    return `
      <div class="mb-3 p-2 border rounded bg-light">
        <div class="d-flex align-items-center mb-1">
          <img src="${avatarUrl}" 
               class="rounded-circle me-2" 
               width="32" 
               height="32" 
               alt="Avatar"
               onerror="this.src='https://placehold.co/32x32/4361ee/white?text=${displayName
                 .charAt(0)
                 .toUpperCase()}'">
          <strong>${displayName}</strong>
        </div>
        <small class="text-muted">${comment.created_at || "الآن"}</small>
        <p class="mt-1 mb-0">${comment.body || ""}</p>
      </div>
    `;
  }

  function renderComment(comment) {
    const author = comment.author || {};

    // ✅ الاسم: خذ من name أولًا، ثم username
    const displayName = author.name || author.username || "مستخدم";

    // ✅ الصورة: إذا كانت سلسلة (رابط)، استخدمها. وإلا، استخدم افتراضية
    const avatarUrl =
      typeof author.profile_image === "string" && author.profile_image.trim()
        ? author.profile_image.trim()
        : `https://placehold.co/32x32/4361ee/white?text=${displayName
            .charAt(0)
            .toUpperCase()}`;

    // ✅ التاريخ: حول ISO إلى تنسيق عربي
    let displayDate = "الآن";
    if (comment.created_at && typeof comment.created_at === "string") {
      if (comment.created_at.includes("ago")) {
        displayDate = comment.created_at; // مثل "5 minutes ago"
      } else {
        const date = new Date(comment.created_at);
        if (!isNaN(date.getTime())) {
          displayDate = new Intl.DateTimeFormat("ar", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(date);
        }
      }
    }

    return `
    <div class="mb-3 p-2 border rounded bg-light">
      <div class="d-flex align-items-center mb-1">
        <img src="${avatarUrl}" 
             class="rounded-circle me-2" 
             width="32" 
             height="32" 
             alt="Avatar"
             onerror="this.src='https://placehold.co/32x32/4361ee/white?text=${displayName
               .charAt(0)
               .toUpperCase()}'">
        <strong>${displayName}</strong>
      </div>
      <small class="text-muted">${displayDate}</small>
      <p class="mt-1 mb-0">${comment.body || ""}</p>
    </div>
  `;
  }

  // ==============================
  // 5. تفاصيل المنشور + التعليقات
  // ==============================
  async function showPostDetails(post) {
    let modalHTML = `
      <div class="modal fade" id="postDetailsModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">تفاصيل المنشور</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <!-- Post -->
              <div class="d-flex align-items-center mb-3">
                <img src="${
                  cleanImageUrl(post.author?.profile_image) ||
                  `https://placehold.co/50x50/4361ee/white?text=${(post.author
                    ?.name || "U")[0].toUpperCase()}`
                }" 
                     class="rounded-circle me-3" width="50" height="50" alt="Avatar"
                     onerror="this.src='https://placehold.co/50x50/4361ee/white?text=${(post
                       .author?.name || "U")[0].toUpperCase()}'">
                <div>
                  <h6 class="mb-0 fw-bold">${
                    post.author?.name || post.author?.username || "مستخدم مجهول"
                  }</h6>
                  <small class="text-muted">${post.created_at || "الآن"}</small>
                </div>
              </div>
              <h5 class="mb-2">${post.title || ""}</h5>
              <p class="mb-3">${post.body || ""}</p>
              ${
                cleanImageUrl(post.image)
                  ? `<img src="${cleanImageUrl(
                      post.image
                    )}" class="img-fluid rounded mb-3" onerror="this.src='https://placehold.co/600x400/f0f4ff/4361ee?text=Image+Error'">`
                  : ""
              }
              
              <hr>
              <h6>التعليقات (${post.comments_count || 0})</h6>
              <div id="commentsList" class="mb-3"></div>
              
              <div id="addCommentSection" class="d-none">
                <textarea class="form-control mb-2" id="commentBody" rows="2" placeholder="اكتب تعليقك..."></textarea>
                <button class="btn btn-primary btn-sm" id="submitCommentBtn">إضافة تعليق</button>
                <div id="commentError" class="text-danger mt-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // إزالة الـ Modal القديم إن وُجد
    const existing = document.getElementById("postDetailsModal");
    if (existing) existing.remove();
    document.body.insertAdjacentHTML("beforeend", modalHTML);

    const modalEl = document.getElementById("postDetailsModal");
    const commentsList = document.getElementById("commentsList");
    const addCommentSection = document.getElementById("addCommentSection");

    // إظهار حقل التعليق إذا كان المستخدم مسجلًا
    if (getAuthData().token) {
      addCommentSection.classList.remove("d-none");
    }

    // جلب التعليقات
    try {
      const commentsData = await fetchComments(post.id);
      const comments = commentsData.data || [];
      commentsList.innerHTML = comments.length
        ? comments.map(renderComment).join("")
        : '<p class="text-muted">لا توجد تعليقات حتى الآن.</p>';
    } catch (error) {
      commentsList.innerHTML =
        '<p class="text-danger">فشل تحميل التعليقات.</p>';
    }

    // حدث إضافة تعليق
    document
      .getElementById("submitCommentBtn")
      ?.addEventListener("click", async () => {
        const body = document.getElementById("commentBody")?.value.trim();
        const errorEl = document.getElementById("commentError");
        if (errorEl) errorEl.textContent = "";

        if (!body) {
          if (errorEl) errorEl.textContent = "التعليق لا يمكن أن يكون فارغًا.";
          return;
        }

        try {
          await addComment(post.id, body);
          const updated = await fetchComments(post.id);
          commentsList.innerHTML =
            updated.data?.map(renderComment).join("") ||
            '<p class="text-muted">لا توجد تعليقات.</p>';
          if (document.getElementById("commentBody"))
            document.getElementById("commentBody").value = "";
        } catch (error) {
          if (errorEl) errorEl.textContent = "فشل إرسال التعليق.";
        }
      });

    // عرض الـ Modal
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    modalEl.addEventListener("hidden.bs.modal", () => modalEl.remove());
  }

  // ==============================
  // 6. التفاعل مع الواجهة (Events)
  // ==============================
  function updateUI() {
    const { user, token } = getAuthData();
    const authButtons = document.getElementById("authButtons");
    const userGreeting = document.getElementById("userGreeting");
    const createPostBtn = document.getElementById("createPostBtn");

    if (token && user) {
      authButtons?.classList.add("d-none");
      userGreeting?.classList.remove("d-none");
      createPostBtn?.classList.remove("d-none");
      if (userGreeting) {
        document.getElementById("navUserName").textContent =
          user.name || user.username;
        const avatar =
          user.profile_image && typeof user.profile_image === "string"
            ? cleanImageUrl(user.profile_image)
            : `https://placehold.co/36x36/4361ee/white?text=${(user.name ||
                user.username ||
                "U")[0].toUpperCase()}`;
        document.getElementById("navAvatar").src = avatar;
      }
    } else {
      authButtons?.classList.remove("d-none");
      userGreeting?.classList.add("d-none");
      createPostBtn?.classList.add("d-none");
    }
  }

  // ==============================
  // 7. تحميل المنشورات (Infinite Scroll)
  // ==============================
  let currentPage = 1;
  let loading = false;
  let hasMore = true;

  async function loadPosts(reset = false) {
    if (loading || (!hasMore && !reset)) return;
    if (reset) {
      document.getElementById("postsContainer").innerHTML = "";
      currentPage = 1;
      hasMore = true;
    }

    loading = true;
    document.getElementById("loadingIndicator")?.classList.remove("d-none");

    try {
      const data = await fetchPosts(currentPage, 10);
      const posts = data.data || [];
      const meta = data.meta || {};

      if (posts.length === 0 && currentPage === 1) {
        document.getElementById("noMorePosts").textContent = "لا توجد منشورات.";
        document.getElementById("noMorePosts")?.classList.remove("d-none");
        return;
      }

      posts.forEach((post) => {
        document.getElementById("postsContainer").appendChild(renderPost(post));
      });

      currentPage++;
      if (meta.current_page >= meta.last_page) hasMore = false;
    } catch (error) {
      if (currentPage === 1) {
        document.getElementById("noMorePosts").textContent = "فشل التحميل.";
        document.getElementById("noMorePosts")?.classList.remove("d-none");
      }
    } finally {
      loading = false;
      document.getElementById("loadingIndicator")?.classList.add("d-none");
    }
  }

  // ==============================
  // 8. بدء التشغيل
  // ==============================
  updateUI();
  loadPosts();

  // أحداث الأزرار (Login, Register, Logout, Create Post)
  document.getElementById("loginBtn")?.addEventListener("click", () => {
    new bootstrap.Modal(document.getElementById("loginModal")).show();
  });
  document.getElementById("registerBtn")?.addEventListener("click", () => {
    new bootstrap.Modal(document.getElementById("registerModal")).show();
  });
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    logout().finally(() => {
      clearAuthData();
      updateUI();
    });
  });
  document.getElementById("createPostBtn")?.addEventListener("click", () => {
    new bootstrap.Modal(document.getElementById("createPostModal")).show();
  });

  // تمرير لا نهائي
  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 1000
    ) {
      loadPosts();
    }
  });

  // ==============================
  // 9. معالجة نماذج المصادقة
  // ==============================

  // تسجيل الدخول
  document
    .getElementById("loginForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value;
      const errorEl = document.getElementById("loginError");
      if (errorEl) errorEl.classList.add("d-none");

      try {
        const response = await login(username, password);
        saveAuthData(response.user, response.token);
        updateUI();
        loadPosts(true);
        bootstrap.Modal.getInstance(
          document.getElementById("loginModal")
        ).hide();
        document.getElementById("loginForm").reset();
      } catch (error) {
        if (errorEl) {
          errorEl.textContent =
            error.response?.data?.message ||
            "فشل تسجيل الدخول. تحقق من بياناتك.";
          errorEl.classList.remove("d-none");
        }
      }
    });

  // إنشاء حساب
  document
    .getElementById("registerForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("registerName").value.trim();
      const username = document.getElementById("registerUsername").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;
      const errorEl = document.getElementById("registerError");
      if (errorEl) errorEl.classList.add("d-none");

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
        if (errorEl) {
          const errors = error.response?.data?.errors;
          if (errors) {
            let msg = "";
            for (const field in errors) msg += `${errors[field][0]}\n`;
            errorEl.textContent = msg;
          } else {
            errorEl.textContent =
              error.response?.data?.message || "فشل إنشاء الحساب.";
          }
          errorEl.classList.remove("d-none");
        }
      }
    });
  // ==============================
  // 10. معالجة نموذج إنشاء منشور
  // ==============================
  document
    .getElementById("createPostForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const title = document.getElementById("postTitle")?.value.trim();
      const body = document.getElementById("postBody")?.value.trim();
      const imageFile = document.getElementById("postImage")?.files[0];
      const tagsInput = document.getElementById("postTags")?.value || "";
      const tags = tagsInput
        ? tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t)
        : [];

      const errorEl = document.getElementById("postError");
      if (errorEl) errorEl.classList.add("d-none");

      if (!body) {
        if (errorEl) {
          errorEl.textContent = "المحتوى مطلوب.";
          errorEl.classList.remove("d-none");
        }
        return;
      }

      try {
        await createPost(title, body, imageFile, tags);

        // إعادة تحميل المنشورات
        document.getElementById("postsContainer").innerHTML = "";
        currentPage = 1;
        hasMore = true;
        loadPosts();

        // إغلاق النافذة
        bootstrap.Modal.getInstance(
          document.getElementById("createPostModal")
        ).hide();
        document.getElementById("createPostForm").reset();
        document.getElementById("suggestedTags").innerHTML = "";
      } catch (error) {
        console.error("خطأ في إنشاء المنشور:", error);
        if (errorEl) {
          const errors = error.response?.data?.errors;
          if (errors) {
            let msg = "";
            for (const field in errors) msg += `${errors[field][0]}\n`;
            errorEl.textContent = msg;
          } else {
            errorEl.textContent =
              error.response?.data?.message ||
              "فشل نشر المنشور. تأكد من اتصالك.";
          }
          errorEl.classList.remove("d-none");
        }
      }
    });

  // === حدث الحذف ===
  document
    .getElementById("postsContainer")
    .addEventListener("click", async (e) => {
      if (e.target.closest(".delete-post-btn")) {
        const postId = e.target.closest(".delete-post-btn").dataset.postId;
        if (!confirm("هل أنت متأكد من حذف هذا المنشور؟")) return;

        try {
          await deletePost(postId);
          // أعد تحميل المنشورات
          document.getElementById("postsContainer").innerHTML = "";
          currentPage = 1;
          hasMore = true;
          loadPosts();
        } catch (error) {
          alert("فشل حذف المنشور. قد لا يكون لك الصلاحية.");
          console.error("خطأ الحذف:", error);
        }
      }
    });

  // === حدث التعديل ===
  document
    .getElementById("postsContainer")
    .addEventListener("click", async (e) => {
      if (e.target.closest(".edit-post-btn")) {
        const postId = e.target.closest(".edit-post-btn").dataset.postId;
        const postElement = e.target.closest(".post-card");
        const post = JSON.parse(postElement.dataset.postData); // سنحفظ البيانات لاحقًا

        // إنشاء Modal للتعديل (مشابه لإنشاء منشور)
        let editModalHTML = `
      <div class="modal fade" id="editPostModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header bg-warning text-white">
              <h5 class="modal-title">تعديل المنشور</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <form id="editPostForm" enctype="multipart/form-data">
                <div class="mb-3">
                  <label class="form-label">العنوان</label>
                  <input type="text" class="form-control" id="editPostTitle" value="${
                    post.title || ""
                  }">
                </div>
                <div class="mb-3">
                  <label class="form-label">المحتوى</label>
                  <textarea class="form-control" id="editPostBody" rows="4" required>${
                    post.body || ""
                  }</textarea>
                </div>
                <div class="mb-3">
                  <label class="form-label">الصورة الحالية</label>
                  ${
                    post.image
                      ? `<img src="${cleanImageUrl(
                          post.image
                        )}" class="img-fluid rounded mb-2" width="100">`
                      : '<p class="text-muted">لا توجد صورة</p>'
                  }
                  <input type="file" class="form-control" id="editPostImage" accept="image/*">
                  <div class="form-text">اتركه فارغًا للحفاظ على الصورة الحالية</div>
                </div>
                <div class="mb-3">
                  <label class="form-label">التاغات (مفصولة بفواصل)</label>
                  <input type="text" class="form-control" id="editPostTags" 
                         value="${(post.tags || [])
                           .map((t) => t.arabic_name || t.name)
                           .join(", ")}">
                </div>
                <div id="editPostError" class="alert alert-danger d-none"></div>
                <button type="submit" class="btn btn-warning w-100">تحديث المنشور</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

        const existing = document.getElementById("editPostModal");
        if (existing) existing.remove();
        document.body.insertAdjacentHTML("beforeend", editModalHTML);

        // حفظ بيانات المنشور في العنصر (للوصول إليها لاحقًا)
        postElement.dataset.postData = JSON.stringify(post);

        // ربط نموذج التعديل
        document
          .getElementById("editPostForm")
          .addEventListener("submit", async (ev) => {
            ev.preventDefault();
            const title = document.getElementById("editPostTitle").value.trim();
            const body = document.getElementById("editPostBody").value.trim();
            const imageFile = document.getElementById("editPostImage").files[0];
            const tagsInput = document.getElementById("editPostTags").value;
            const tags = tagsInput
              ? tagsInput
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t)
              : [];
            const errorEl = document.getElementById("editPostError");
            if (errorEl) errorEl.classList.add("d-none");

            try {
              await updatePost(postId, title, body, imageFile, tags);
              // أعد التحميل
              document.getElementById("postsContainer").innerHTML = "";
              currentPage = 1;
              hasMore = true;
              loadPosts();
              bootstrap.Modal.getInstance(
                document.getElementById("editPostModal")
              ).hide();
            } catch (error) {
              console.error("خطأ التعديل:", error);
              if (errorEl) {
                errorEl.textContent =
                  error.response?.data?.message || "فشل تحديث المنشور.";
                errorEl.classList.remove("d-none");
              }
            }
          });

        const modal = new bootstrap.Modal(
          document.getElementById("editPostModal")
        );
        modal.show();
        document
          .getElementById("editPostModal")
          .addEventListener("hidden.bs.modal", () => {
            document.getElementById("editPostModal").remove();
          });
      }
    });
  // حدث عرض تفاصيل المنشور
  document.getElementById("postsContainer").addEventListener("click", (e) => {
    if (e.target.closest(".view-details-btn")) {
      const postId = e.target.closest(".view-details-btn").dataset.postId;
      // نحتاج إلى جلب المنشور الكامل (لأن post في renderPost قد لا يحتوي على comments)
      // لكن بما أننا نستخدم نفس الكائن، يمكننا استخدام dataset
      const postElement = e.target.closest(".post-card");
      const post = JSON.parse(postElement.dataset.postData);
      showPostDetails(post);
    }
  });
  // معالجة نماذج Login / Register / Create Post
  // (تم تضمينها في HTML عبر Bootstrap Modals)
})();
