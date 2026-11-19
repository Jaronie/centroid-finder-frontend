// Not part of the test suite: drives the app against the REAL backend to
// capture the screenshots used in the README.
function setReactInput(selector, value) {
  cy.get(selector).then(($el) => {
    const el = $el[0];
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

const slider = '[data-testid=threshold-slider] input[type=range]';
const shot = (name) => {
  cy.scrollTo('top', { ensureScrollable: false });
  cy.wait(250);
  cy.screenshot(name, { capture: 'fullPage' });
};

describe('screenshots', () => {
  it('video chooser', () => {
    cy.visit('/videos');
    cy.get('.MuiListItemButton-root').should('exist');
    shot('01-video-chooser');
  });

  it('preview and live tuning', () => {
    cy.visit('/preview/testclip.mp4');
    cy.get('[data-testid=binarized-canvas]').should('be.visible');
    setReactInput(slider, 120);
    setReactInput('[data-testid=color-picker]', '#1a1a1a');
    cy.get('[data-testid=centroid]').should('contain', '(159, 119)');
    shot('02-live-tuning');
  });

  it('crop region', () => {
    cy.visit('/preview/testclip.mp4');
    cy.get('[data-testid=binarized-canvas]').should('be.visible');
    setReactInput(slider, 200);
    setReactInput('[data-testid=color-picker]', '#000000');
    cy.get('[data-testid=crop-surface]').then(($svg) => {
      const r = $svg[0].getBoundingClientRect();
      cy.get('[data-testid=crop-surface]')
        .trigger('pointerdown', { clientX: r.left + r.width * 0.15, clientY: r.top + r.height * 0.2, pointerId: 1 })
        .trigger('pointermove', { clientX: r.left + r.width * 0.75, clientY: r.top + r.height * 0.85, pointerId: 1 })
        .trigger('pointerup',   { clientX: r.left + r.width * 0.75, clientY: r.top + r.height * 0.85, pointerId: 1 });
    });
    cy.contains('Search region:').should('be.visible');
    shot('03-crop-region');
  });

  it('job completes and links the CSV (real backend)', () => {
    cy.visit('/preview/testclip.mp4');
    cy.get('[data-testid=binarized-canvas]').should('be.visible');
    setReactInput(slider, 120);
    setReactInput('[data-testid=color-picker]', '#1a1a1a');
    cy.get('[data-testid=process-button]').click();
    cy.get('[data-testid=job-status]', { timeout: 60000 }).should('contain', 'done');
    cy.get('[data-testid=csv-link]').should('be.visible');
    shot('04-job-done');
  });
});
