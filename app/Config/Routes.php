<?php

use CodeIgniter\Router\RouteCollection;

/** @var RouteCollection $routes */

// ---------------------------------------------------------------- API publique
$routes->group('api', ['namespace' => 'App\Controllers\Api'], static function (RouteCollection $r) {
    $r->get('config', 'Catalog::config');
    $r->get('services', 'Catalog::services');
    $r->get('services/(:segment)', 'Catalog::service/$1');

    $r->get('availability', 'Bookings::slots');
    $r->get('availability/month', 'Bookings::month');
    $r->post('bookings', 'Bookings::create', ['filter' => 'throttle:8,60']);
    $r->get('bookings/(:segment)', 'Bookings::show/$1');
    $r->post('bookings/(:segment)/cancel', 'Bookings::cancel/$1', ['filter' => 'throttle:5,60']);
    $r->post('bookings/(:segment)/abandon', 'Bookings::abandon/$1');
    $r->post('bookings/(:segment)/simulate-payment', 'Bookings::simulate/$1');
    $r->post('stripe/webhook', 'StripeWebhook::handle');

    $r->get('posts', 'Content::posts');
    $r->get('posts/categories', 'Content::categories');
    $r->get('posts/(:segment)', 'Content::post/$1');

    $r->post('newsletter/subscribe', 'Content::subscribe', ['filter' => 'throttle:5,60']);
    $r->post('newsletter/confirm', 'Content::confirm');
    $r->post('newsletter/unsubscribe', 'Content::unsubscribe');

    $r->get('reviews', 'Content::reviews');
    $r->get('reviews/context', 'Content::reviewContext');
    $r->post('reviews', 'Content::submitReview', ['filter' => 'throttle:4,60']);

    $r->post('contact', 'Content::contact', ['filter' => 'throttle:4,60']);
});

// ---------------------------------------------------------------- API admin
$routes->post('api/admin/login', 'Admin\Auth::login', ['filter' => 'throttle:6,60']);

$routes->group('api/admin', ['namespace' => 'App\Controllers\Admin', 'filter' => 'adminauth'], static function (RouteCollection $r) {
    $r->get('me', 'Auth::me');
    $r->post('logout', 'Auth::logout');
    $r->post('password', 'Auth::password');

    $r->get('dashboard', 'Dashboard::index');

    $r->get('bookings', 'Bookings::index');
    $r->get('bookings/calendar', 'Bookings::calendar');
    $r->get('bookings/slots', 'Bookings::slots');
    $r->get('bookings/export', 'Bookings::export');
    $r->post('bookings', 'Bookings::create');
    $r->get('bookings/(:num)', 'Bookings::show/$1');
    $r->patch('bookings/(:num)', 'Bookings::update/$1');
    $r->post('bookings/(:num)/paid', 'Bookings::paidOnSite/$1');
    $r->post('bookings/(:num)/cancel', 'Bookings::cancel/$1');
    $r->post('bookings/(:num)/review-request', 'Bookings::reviewRequest/$1');

    $r->get('catalog', 'Catalog::index');
    $r->post('catalog/reorder', 'Catalog::reorder');
    $r->post('categories', 'Catalog::saveCategory');
    $r->put('categories/(:num)', 'Catalog::saveCategory/$1');
    $r->delete('categories/(:num)', 'Catalog::deleteCategory/$1');
    $r->post('services', 'Catalog::saveService');
    $r->put('services/(:num)', 'Catalog::saveService/$1');
    $r->delete('services/(:num)', 'Catalog::deleteService/$1');

    $r->get('posts', 'Posts::index');
    $r->post('posts', 'Posts::save');
    $r->post('uploads', 'Posts::upload');
    $r->get('posts/(:num)', 'Posts::show/$1');
    $r->put('posts/(:num)', 'Posts::save/$1');
    $r->delete('posts/(:num)', 'Posts::delete/$1');

    $r->get('reviews', 'Community::reviews');
    $r->patch('reviews/(:num)', 'Community::updateReview/$1');
    $r->delete('reviews/(:num)', 'Community::deleteReview/$1');

    $r->get('subscribers', 'Community::subscribers');
    $r->post('subscribers', 'Community::addSubscriber');
    $r->get('subscribers/export', 'Community::exportSubscribers');
    $r->delete('subscribers/(:num)', 'Community::deleteSubscriber/$1');

    $r->get('campaigns', 'Community::campaigns');
    $r->post('campaigns', 'Community::saveCampaign');
    $r->put('campaigns/(:num)', 'Community::saveCampaign/$1');
    $r->delete('campaigns/(:num)', 'Community::deleteCampaign/$1');
    $r->post('campaigns/(:num)/send', 'Community::sendCampaign/$1');

    $r->get('messages', 'Community::messages');
    $r->post('messages/(:num)/read', 'Community::readMessage/$1');
    $r->delete('messages/(:num)', 'Community::deleteMessage/$1');

    $r->get('settings', 'SettingsController::index');
    $r->put('settings', 'SettingsController::update');
    $r->post('closures', 'SettingsController::addClosure');
    $r->delete('closures/(:num)', 'SettingsController::deleteClosure/$1');
});

// API inconnue → 404 JSON (et pas la page Vue)
$routes->match(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], 'api/(:any)', static function () {
    return service('response')->setStatusCode(404)->setJSON(['error' => 'Route API inconnue.']);
});

// ---------------------------------------------------------------- Système
$routes->get('install', 'System::install');
$routes->get('cron', 'System::cron');
$routes->get('sitemap.xml', 'Spa::sitemap');
$routes->get('robots.txt', 'Spa::robots');

// ---------------------------------------------------------------- Site (Vue)
$routes->get('/', 'Spa::index');
$routes->get('(:any)', 'Spa::index/$1');
