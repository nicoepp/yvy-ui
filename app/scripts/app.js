'use strict';

/**
 * @ngdoc overview
 * @name yvyUiApp
 * @description
 * # yvyUiApp
 *
 * Main module of the application.
 */
angular
  .module('yvyUiApp', [
    'ngAnimate',
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'angularUtils.directives.dirPagination'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/mapa', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl',
        activetab: 'mapa'
      })
      .when('/datos', {
        templateUrl: 'views/data_list.html',
        controller: 'DataTableCtrl',
        activetab: 'datos'
      })
      .when('/about-us', {
        template: '<div class="container"><p style="padding: 60px 0">Acerca de nosotros</p></div>',
        activetab: 'about'
      })
      .when('/', {
        template: '<div class="container"><p style="padding: 60px 0">Página principal</p></div>',
        activetab: 'home'
      })
      .otherwise({
        redirectTo: '/mapa'
      });
  });
