'use strict';

/**
 * @ngdoc function
 * @name yvyUiApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the yvyUiApp
 */
angular.module('yvyUiApp')
  .controller('DataTableCtrl', function ($scope) {

    $scope.animales = [
      {
        "nombre": "Elefante",
        "categoria": "mamífero",
        "descripcion": "Animal Grande (Elefante)",
        "origen": "Africa"
      },
      {
        "nombre": "Elefante",
        "categoria": "mamífero",
        "descripcion": "Animal Grande",
        "origen": "Africa"
      },
      {
        "nombre": "Jirafa",
        "categoria": "mamífero",
        "descripcion": "Animal Grande",
        "origen": "Africa"
      },
      {
        "nombre": "Elefante",
        "categoria": "mamífero",
        "descripcion": "Animal Grande",
        "origen": "Africa"
      },
      {
        "nombre": "Rinoceronte",
        "categoria": "mamífero",
        "descripcion": "Animal Grande",
        "origen": "Africa"
      }
    ];

    $scope.pagesize = 4;
    $scope.sortType     = 'nombre'; // set the default sort type
    $scope.sortReverse  = false;    // set the default sort order
    $scope.search = {};

    $scope.activateSortCol = function (col) {
      if($scope.sortType == col) {
        $scope.sortReverse = !$scope.sortReverse;
      }
      else {
        $scope.sortType = col;
        $scope.sortReverse = false;
      }
    };

  });
