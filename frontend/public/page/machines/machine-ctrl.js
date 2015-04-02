angular.module('app')
.controller('MachineCtrl', function($scope, $routeParams, k8s) {
  'use strict';

  $scope.loadError = false;

  k8s.nodes.get($routeParams.name)
    .then(function(node) {
      $scope.machine = node;
      $scope.loadError = false;
    })
    .catch(function() {
      $scope.machine = null;
      $scope.loadError = true;
    });

});
