# TODO - Host Link & Host Page (Password Protected)

- [x] Create landing host-link checklist in TODO.md
- [x] Add host link button to landing (`index.html`) that navigates to a new `host.html` page.
- [x] Create `host.html` with password prompt gate.
- [x] Create `host.js` for password flow + host UI behavior (slideshow placeholder + QR code generation).
- [x] Update `styles.css` with host-page layout styling.
- [ ] Smoke test: landing → host login (correct/incorrect password).

---

# TODO - Backend (uploads + live host gallery)

- [x] Create Node/Express backend with upload + slide endpoints
- [x] Wire guest camera page to upload captured media to backend
- [x] Wire host page to poll slides and render live gallery + slideshow
- [ ] Add storage provider option (Cloud/Dropbox) - implemented as a toggle-ready interface (hooks)
- [ ] Smoke test: guest uploads appear on host gallery within polling interval


