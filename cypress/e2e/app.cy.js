/**
 * End-to-end tests for the whole flow: choose a video, tune the settings,
 * submit a job, and wait for the CSV.
 *
 * Every backend call is stubbed with cy.intercept, so these tests are
 * deterministic and do not need the Java server running. The stubs return the
 * exact response shapes the real API returns -- a bare JSON array for the video
 * list, 202 + {jobId} for a submission, and the three status shapes -- so a
 * passing test means the frontend handles the real contract.
 */

const VIDEOS = ['testclip.mp4', 'salamander2.mov'];

/**
 * Sets a React-controlled input's value the way a user would.
 *
 * Calling .invoke('val', x) is not enough: React patches the value setter on
 * HTMLInputElement to track changes, so assigning through jQuery updates the
 * DOM but leaves React's internal value unchanged, and the onChange handler
 * never sees the new value. Going through the prototype's native setter and
 * then dispatching a bubbling 'input' event is what React actually listens
 * for, so state updates exactly as it does for a real drag.
 */
function setReactInput(selector, value) {
  cy.get(selector).then(($el) => {
    const el = $el[0];
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    ).set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/** Stubs the endpoints every page needs. */
function stubCommon() {
  cy.intercept('GET', '/api/videos', { statusCode: 200, body: VIDEOS }).as('videos');

  // The thumbnail must be real image bytes, because the page decodes it and
  // reads its pixels to binarize. A JSON stub would fail to load.
  cy.intercept('GET', '/thumbnail/*', {
    statusCode: 200,
    headers: { 'content-type': 'image/jpeg' },
    // Cypress infers binary encoding from the image extension here. (The
    // "frame.jpg,binary" form belongs to cy.fixture(), not cy.intercept() --
    // using it here sends a corrupt body and the <img> fails to decode.)
    fixture: 'frame.jpg',
  }).as('thumbnail');
}

describe('Video Chooser (/videos)', () => {
  beforeEach(stubCommon);

  it('lists the videos returned by GET /api/videos', () => {
    cy.visit('/videos');
    cy.wait('@videos');

    cy.get('[data-testid=video-list] li').should('have.length', VIDEOS.length);
    cy.contains('testclip.mp4').should('be.visible');
  });

  it('redirects / to /videos', () => {
    cy.visit('/');
    cy.location('pathname').should('eq', '/videos');
  });

  it('navigates to the preview page when a video is clicked', () => {
    cy.visit('/videos');
    cy.wait('@videos');

    cy.contains('testclip.mp4').click();
    cy.location('pathname').should('eq', '/preview/testclip.mp4');
    cy.wait('@thumbnail');
  });

  it('shows an error when the video list fails', () => {
    cy.intercept('GET', '/api/videos', {
      statusCode: 500,
      body: { error: 'Error reading video directory' },
    }).as('failed');

    cy.visit('/videos');
    cy.wait('@failed');
    cy.get('[data-testid=videos-error]').should('contain', 'Error reading video directory');
  });
});

describe('Video Preview (/preview/:filename)', () => {
  beforeEach(() => {
    stubCommon();
    cy.visit('/preview/testclip.mp4');
    cy.wait('@thumbnail');
  });

  it('shows the original frame beside a binarized version', () => {
    cy.get('img[alt*="First frame"]').should('be.visible');
    cy.get('[data-testid=binarized-canvas]')
      .should('be.visible')
      // The canvas is sized from the real frame, so this proves the pixels
      // were decoded rather than the element merely existing.
      .and(($c) => {
        expect($c[0].width).to.eq(320);
        expect($c[0].height).to.eq(240);
      });
  });

  it('recomputes the centroid live as the threshold changes', () => {
    // At threshold 0 nothing can match: the comparison is strictly less-than.
    setReactInput('[data-testid=threshold-slider]', 0);
    cy.get('[data-testid=centroid]').should('contain', 'no match');

    // Wide open: everything matches, so one group covers the whole frame and
    // the centroid sits at its middle.
    setReactInput('[data-testid=threshold-slider]', 442);
    cy.get('[data-testid=centroid]').should('contain', '(159, 119)');
    cy.get('[data-testid=stats]').should('contain', '76800 px');
  });

  it('updates the preview when the target color changes', () => {
    setReactInput('[data-testid=threshold-slider]', 120);

    // Black target: the dark frame matches.
    cy.get('.hex-input').clear().type('1A1A1A');
    cy.get('[data-testid=centroid]').should('contain', '(159, 119)');

    // A saturated color nothing in the frame is near: no match.
    cy.get('.hex-input').clear().type('FF00FF');
    cy.get('[data-testid=centroid]').should('contain', 'no match');
  });

  it('restricts the search to a dragged crop region and clears it again', () => {
    setReactInput('[data-testid=threshold-slider]', 442);

    // Drag a rectangle over the top-left quarter of the frame.
    cy.get('[data-testid=crop-surface]').then(($svg) => {
      const r = $svg[0].getBoundingClientRect();
      cy.get('[data-testid=crop-surface]')
        .trigger('pointerdown', { clientX: r.left + 5, clientY: r.top + 5, pointerId: 1 })
        .trigger('pointermove', {
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          pointerId: 1,
        })
        .trigger('pointerup', {
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          pointerId: 1,
        });
    });

    // The region is reported, and the group is now smaller than the full frame.
    cy.contains('Search region:').should('be.visible');
    cy.get('[data-testid=stats]').should('not.contain', '76800 px');

    cy.get('[data-testid=clear-roi]').click();
    cy.get('[data-testid=stats]').should('contain', '76800 px');
  });
});

describe('Job submission and tracking', () => {
  beforeEach(stubCommon);

  it('submits the settings, polls the status, and links the finished CSV', () => {
    cy.intercept('POST', '/process/testclip.mp4*', (req) => {
      // The API requires BARE hex: a leading "#" is a 400.
      expect(req.query.targetColor).to.match(/^[0-9a-fA-F]{6}$/);
      expect(req.query.threshold).to.eq('150');
      req.reply({ statusCode: 202, body: { jobId: 'job-123' } });
    }).as('submit');

    // First poll reports processing, the next reports done.
    let polls = 0;
    cy.intercept('GET', '/process/job-123/status', (req) => {
      polls += 1;
      req.reply(
        polls === 1
          ? { statusCode: 200, body: { status: 'processing' } }
          : {
              statusCode: 200,
              body: { status: 'done', result: '/results/testclip.mp4.csv' },
            }
      );
    }).as('status');

    cy.visit('/preview/testclip.mp4');
    cy.wait('@thumbnail');

    setReactInput('[data-testid=threshold-slider]', 150);

    cy.get('[data-testid=process-button]').click();
    cy.wait('@submit');

    cy.get('[data-testid=job-status]').should('contain', 'processing');
    cy.get('[data-testid=job-status]').should('contain', 'job-123');

    cy.wait('@status');
    cy.get('[data-testid=job-status]', { timeout: 10000 }).should('contain', 'done');
    cy.get('[data-testid=csv-link]')
      .should('have.attr', 'href', '/results/testclip.mp4.csv');
  });

  it('shows the error the server reports for a failed job', () => {
    cy.intercept('POST', '/process/testclip.mp4*', {
      statusCode: 202,
      body: { jobId: 'job-bad' },
    });
    cy.intercept('GET', '/process/job-bad/status', {
      statusCode: 200,
      body: { status: 'error', error: 'Error processing video: Unexpected ffmpeg error' },
    }).as('status');

    cy.visit('/preview/testclip.mp4');
    cy.wait('@thumbnail');
    cy.get('[data-testid=process-button]').click();

    cy.get('[data-testid=job-error]', { timeout: 10000 })
      .should('contain', 'Unexpected ffmpeg error');
  });

  it('surfaces a 400 from the server when submission is rejected', () => {
    cy.intercept('POST', '/process/testclip.mp4*', {
      statusCode: 400,
      body: { error: 'Missing targetColor or threshold query parameter.' },
    }).as('submit');

    cy.visit('/preview/testclip.mp4');
    cy.wait('@thumbnail');
    cy.get('[data-testid=process-button]').click();
    cy.wait('@submit');

    cy.get('[data-testid=job-error]').should('contain', 'Missing targetColor');
  });
});
