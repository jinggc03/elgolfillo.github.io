const siteContent = window.SITE_CONTENT || {};
const documentRoot = document.documentElement;
const body = document.body;
const languageButtons = Array.from(document.querySelectorAll("[data-lang-target]"));
const metaDescription = document.getElementById("meta-description");
const metaKeywords = document.getElementById("meta-keywords");
const brandLink = document.getElementById("site-brand");
const siteNav = document.getElementById("site-nav");
const headerLinkedIn = document.getElementById("header-linkedin");
const footerCopy = document.getElementById("footer-copy");
const menuToggle = document.querySelector(".menu-toggle");
const sectionRoots = {
  hero: document.getElementById("hero"),
  about: document.getElementById("about"),
  build: document.getElementById("build"),
  work: document.getElementById("work"),
  contact: document.getElementById("contact"),
};
const sectionElements = Object.values(sectionRoots).filter(Boolean);
const emailHref = "mailto:jingguan.chong@gmail.com";
const linkedInHref = "https://www.linkedin.com/in/jingchong/";

let currentLanguage = localStorage.getItem("preferred-language") || "en";
let rotatingIndex = 0;
let rotatingTimer = null;
let revealObserver = null;
let navObserver = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getContent(lang) {
  return siteContent[lang] || siteContent.en;
}

function renderSectionHeading(section, level = "h2", compact = false) {
  return `
    <div class="section-heading${compact ? " section-heading-compact" : ""}">
      <p class="section-kicker">${escapeHtml(section.kicker)}</p>
      <${level}>${escapeHtml(section.title)}</${level}>
      ${section.intro ? `<p class="section-intro">${escapeHtml(section.intro)}</p>` : ""}
    </div>
  `;
}

function renderHero(content) {
  const logos = content.hero.logos
    .map((logo) => {
      const modifier = logo.modifier ? ` ${escapeHtml(logo.modifier)}` : "";
      return `
        <span class="signal-logo${modifier}">
          <img src="${escapeHtml(logo.src)}" alt="${escapeHtml(logo.alt)}" />
        </span>
      `;
    })
    .join("");

  const roles = content.hero.roles
    .map((role) => `<li>${escapeHtml(role)}</li>`)
    .join("");

  return `
    <div class="hero-copy" data-reveal>
      <p class="eyebrow">${escapeHtml(content.hero.eyebrow)}</p>
      <h1>${escapeHtml(content.hero.headline)}</h1>
      <p class="hero-summary">${escapeHtml(content.hero.summary)}</p>

      <ul class="role-list">
        ${roles}
      </ul>

      <div class="contexts-strip" data-reveal>
        <p class="signal-caption">${escapeHtml(content.hero.contextsLabel)}</p>
        <div class="signal-strip" aria-label="Credibility signals">
          ${logos}
          <span class="signal-badge">${escapeHtml(content.hero.startmotionBadge)}</span>
        </div>
      </div>
    </div>

    <aside class="hero-aside" data-reveal>
      <div class="portrait-panel">
        <div class="portrait-card">
          <img src="assets/img/portrait/main_photo.jpg" alt="${escapeHtml(content.hero.photoAlt)}" />
        </div>

        <div class="focus-card">
          <p class="focus-label">${escapeHtml(content.hero.focusLabel)}</p>
          <p class="focus-term" id="rotating-term" aria-live="polite"></p>
          <p class="focus-copy">${escapeHtml(content.hero.focusBody)}</p>
        </div>
      </div>
    </aside>
  `;
}

function renderAbout(content) {
  const paragraphs = content.about.paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");

  const facts = content.about.facts
    .map(
      (fact) => `
        <li>
          <span>${escapeHtml(fact.label)}</span>
          <strong>${escapeHtml(fact.value)}</strong>
        </li>
      `
    )
    .join("");

  const systems = content.about.systemsWorkedOn
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  return `
    ${renderSectionHeading(content.about)}
    <div class="about-grid">
      <div class="copy-stack" data-reveal>
        ${paragraphs}
      </div>

      <div class="about-aside">
        <aside class="positioning-note" data-reveal>
          <p class="positioning-quote">${escapeHtml(content.about.note)}</p>
          <ul class="meta-list">
            ${facts}
          </ul>
        </aside>

        <aside class="systems-card content-card" data-reveal>
          <p class="card-tag">${escapeHtml(content.about.systemsTag)}</p>
          <h3>${escapeHtml(content.about.systemsTitle)}</h3>
          <p>${escapeHtml(content.about.systemsIntro)}</p>
          <ul class="systems-list">
            ${systems}
          </ul>
          <p class="systems-note">${escapeHtml(content.about.systemsNote)}</p>
        </aside>

        <aside class="global-card" data-reveal>
          <p class="card-tag">${escapeHtml(content.about.globalTag)}</p>
          <h3>${escapeHtml(content.about.globalTitle)}</h3>
          <p>${escapeHtml(content.about.globalBody)}</p>
          <div class="global-map-frame">
            <img src="assets/img/illustrations/world-map.png" alt="${escapeHtml(content.about.mapAlt)}" />
          </div>
        </aside>
      </div>
    </div>
  `;
}

function renderCards(cards, cardClass = "content-card", extraRenderer = null) {
  return cards
    .map((card) => {
      const classes = [cardClass];
      if (card.featured) {
        classes.push("work-card-featured");
      }
      return `
        <article class="${classes.join(" ")}" data-reveal>
          <p class="card-tag">${escapeHtml(card.tag)}</p>
          <h3>${escapeHtml(card.title)}</h3>
          ${card.role ? `<p class="card-role">${escapeHtml(card.role)}</p>` : ""}
          <p>${escapeHtml(card.body)}</p>
          ${extraRenderer ? extraRenderer(card) : ""}
        </article>
      `;
    })
    .join("");
}

function renderBuild(content) {
  return `
    ${renderSectionHeading(content.build)}
    <div class="card-grid build-grid">
      ${renderCards(content.build.cards)}
    </div>
  `;
}

function renderWork(content) {
  const workCards = renderCards(content.work.cards, "content-card work-card");
  const highlightCards = renderCards(content.highlights.cards, "content-card highlight-card", (card) => {
    return `<p class="highlight-outcome">${escapeHtml(card.outcome)}</p>`;
  });

  return `
    ${renderSectionHeading(content.work)}
    <div class="card-grid current-work-grid">
      ${workCards}
    </div>

    <div class="highlights-block" data-reveal>
      ${renderSectionHeading(content.highlights, "h3", true)}
      <div class="card-grid highlights-grid">
        ${highlightCards}
      </div>
    </div>
  `;
}

function renderContact(content) {
  return `
    ${renderSectionHeading(content.contact)}
    <div class="contact-grid">
      <a class="contact-link-card" href="${escapeHtml(emailHref)}">
        <span>${escapeHtml(content.contact.emailLabel)}</span>
        <strong>${escapeHtml(content.contact.emailValue)}</strong>
      </a>

      <a class="contact-link-card" href="${escapeHtml(linkedInHref)}" target="_blank" rel="noopener noreferrer">
        <span>${escapeHtml(content.contact.linkedinLabel)}</span>
        <strong>${escapeHtml(content.contact.linkedinValue)}</strong>
      </a>
    </div>

    <p class="contact-note">${escapeHtml(content.contact.note)}</p>
  `;
}

function closeMobileNav() {
  if (!menuToggle || !siteNav) {
    return;
  }

  menuToggle.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
  siteNav.classList.remove("is-open");
}

function updateLanguageButtons(lang) {
  languageButtons.forEach((button) => {
    const isActive = button.dataset.langTarget === lang;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function bindNavLinks() {
  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileNav();
    });
  });
}

function initSectionObserver() {
  if (navObserver) {
    navObserver.disconnect();
  }

  const navLinks = Array.from(siteNav.querySelectorAll("a"));
  if (sectionElements.length === 0 || navLinks.length === 0) {
    return;
  }

  navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const currentId = entry.target.getAttribute("id");
        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${currentId}`;
          link.classList.toggle("is-active", isActive);
        });
      });
    },
    {
      threshold: 0.35,
      rootMargin: "-20% 0px -45% 0px",
    }
  );

  sectionElements.forEach((section) => navObserver.observe(section));
}

function initRevealObserver() {
  const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));
  if (revealObserver) {
    revealObserver.disconnect();
  }

  if (revealTargets.length === 0) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealTargets.forEach((target, index) => {
    target.style.transitionDelay = `${Math.min(index * 30, 180)}ms`;
    revealObserver.observe(target);
  });
}

function updateRotatingTerm() {
  const content = getContent(currentLanguage);
  const rotatingTerm = document.getElementById("rotating-term");
  const terms = content.hero.rotatingTerms || [];

  if (!rotatingTerm || terms.length === 0) {
    return;
  }

  rotatingTerm.classList.add("is-switching");

  window.setTimeout(() => {
    rotatingTerm.textContent = terms[rotatingIndex % terms.length];
    rotatingTerm.classList.remove("is-switching");
  }, 140);
}

function renderLanguage(lang) {
  const content = getContent(lang);
  currentLanguage = lang;
  rotatingIndex = 0;

  body.dataset.language = lang;
  documentRoot.lang = lang;
  document.title = content.meta.title;
  metaDescription.setAttribute("content", content.meta.description);
  metaKeywords.setAttribute("content", content.meta.keywords);
  brandLink.textContent = content.header.brand;
  headerLinkedIn.textContent = content.header.linkedinLabel;
  footerCopy.textContent = content.footer.copy;

  siteNav.innerHTML = content.nav
    .map((item) => `<a href="#${escapeHtml(item.id)}">${escapeHtml(item.label)}</a>`)
    .join("");

  sectionRoots.hero.innerHTML = renderHero(content);
  sectionRoots.about.innerHTML = renderAbout(content);
  sectionRoots.build.innerHTML = renderBuild(content);
  sectionRoots.work.innerHTML = renderWork(content);
  sectionRoots.contact.innerHTML = renderContact(content);

  updateLanguageButtons(lang);
  closeMobileNav();
  bindNavLinks();
  initRevealObserver();
  initSectionObserver();
  updateRotatingTerm();
  localStorage.setItem("preferred-language", lang);
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const willOpen = !siteNav.classList.contains("is-open");
    menuToggle.classList.toggle("is-open", willOpen);
    menuToggle.setAttribute("aria-expanded", String(willOpen));
    siteNav.classList.toggle("is-open", willOpen);
  });
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    renderLanguage(button.dataset.langTarget);
  });
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 820) {
    closeMobileNav();
  }
});

if (!siteContent[currentLanguage]) {
  currentLanguage = "en";
}

renderLanguage(currentLanguage);

if (rotatingTimer) {
  window.clearInterval(rotatingTimer);
}

rotatingTimer = window.setInterval(() => {
  const terms = getContent(currentLanguage).hero.rotatingTerms || [];
  if (terms.length === 0) {
    return;
  }

  rotatingIndex = (rotatingIndex + 1) % terms.length;
  updateRotatingTerm();
}, 2400);
