// Not part of the test suite: drives the app against the REAL backend to
// capture the screenshots used in the README.
function setReactInput(selector, value) {
  cy.get(selector).then(($el) => {
    const el = $el[0];
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('screenshots', () => {
  it('video chooser', () => {
    cy.visit('/videos');
    cy.get('[data-testid=video-list] li').should('exist');
    cy.scrollTo('top', { ensureScrollable: false }); cy.wait(250); cy.screenshot('01-video-chooser', { capture: 'fullPage' });
  });

  it('preview and live tuning', () => {
    cy.visit('/preview/testclip.mp4');
    cy.get('[data-testid=binarized-canvas]').should('be.visible');
    setReactInput('[data-testid=threshold-slider]', 120);
    cy.get('.hex-input').clear().type('1A1A1A');
    cy.get('[data-testid=centroid]').should('contain', '(159, 119)');
    cy.scrollTo('top', { ensureScrollable: false }); cy.wait(250); cy.screenshot('02-preview-tuning', { capture: 'fullPage' });
  });

  it('crop region', () => {
    cy.visit('/preview/testclip.mp4');
    cy.get('[data-testid=binarized-canvas]').should('be.visible');
    setReactInput('[data-testid=threshold-slider]', 200);
    cy.get('[data-testid=crop-surface]').then(($svg) => {
      const r = $svg[0].getBoundingClientRect();
      cy.get('[data-testid=crop-surface]')
        .trigger('pointerdown', { clientX: r.left + r.width * 0.15, clientY: r.top + r.height * 0.2, pointerId: 1 })
        .trigger('pointermove', { clientX: r.left + r.width * 0.75, clientY: r.top + r.height * 0.85, pointerId: 1 })
        .trigger('pointerup',   { clientX: r.left + r.width * 0.75, clientY: r.top + r.height * 0.85, pointerId: 1 });
    });
    cy.contains('Search region:').should('be.visible');
    cy.scrollTo('top', { ensureScrollable: false }); cy.wait(250); cy.screenshot('03-crop-region', { capture: 'fullPage' });
  });

  it('job completes and links the CSV (real backend)', () => {
    cy.visit('/preview/testclip.mp4');
    cy.get('[data-testid=binarized-canvas]').should('be.visible');
    setReactInput('[data-testid=threshold-slider]', 120);
    cy.get('[data-testid=process-button]').click();
    cy.get('[data-testid=job-status]', { timeout: 60000 }).should('contain', 'done');
    cy.get('[data-testid=csv-link]').should('be.visible');
    cy.scrollTo('top', { ensureScrollable: false }); cy.wait(250); cy.screenshot('04-job-done', { capture: 'fullPage' });
  });
});
