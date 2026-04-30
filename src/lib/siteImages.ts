// Photos live in public/images/aad/ as 01.jpg ... 16.jpg.
// Order matches the sequence in which photos were dropped into chat.

export interface SitePhoto {
  src: string;
  alt: string;
}

export const AAD_GALLERY: SitePhoto[] = [
  { src: '/images/aad/1.jpg', alt: 'Foam-brush wheel wash on silver sedan' },
  { src: '/images/aad/2.jpg', alt: 'Tire dressing application' },
  { src: '/images/aad/3.jpg', alt: 'Paint correction with dual-action polisher' },
  { src: '/images/aad/4.jpg', alt: 'Alfa Romeo wheel mid-wash' },
  { src: '/images/aad/5.jpg', alt: 'Porsche GT3 RS full detail' },
  { src: '/images/aad/6.jpg', alt: 'Mercedes GLE interior clean' },
  { src: '/images/aad/7.jpg', alt: 'Foam wash on Mercedes G-wagen' },
  { src: '/images/aad/8.jpg', alt: 'Night-shot GT-R detailing' },
  { src: '/images/aad/9.jpg', alt: 'Pressure rinse on Nissan 370Z Nismo' },
  { src: '/images/aad/10.jpg', alt: 'Suds on black Mercedes hood' },
  { src: '/images/aad/11.jpg', alt: 'BMW 3-series interior detail' },
  { src: '/images/aad/12.jpg', alt: 'BMW M4 CS taillight polish' },
  { src: '/images/aad/13.jpg', alt: 'Tesla Model 3 foam cannon wash' },
  { src: '/images/aad/14.jpg', alt: 'Porsche wheel dressing application' },
  { src: '/images/aad/15.jpg', alt: 'Mercedes S-Class luxury interior detail' },
  { src: '/images/aad/16.jpg', alt: 'BMW X6 foam pre-wash' },
];

// Featured images used in specific layout slots.
export const HERO_IMAGE: SitePhoto = AAD_GALLERY[4]; // 05.jpg - Porsche GT3 RS
export const DASHBOARD_BANNER: SitePhoto = {
  src: '/images/aad/hero-s-class.jpg',
  alt: 'Mercedes S-Class detailed by Austin Auto Detail',
};
export const BOOK_CTA_IMAGE: SitePhoto = {
  src: '/images/aad/cta-king-ranch.jpg',
  alt: 'Ford F-150 King Ranch interior detailed by Austin Auto Detail',
};
