// var app = angular.module('polls');

// app.controller('profileControl', function($location, $scope, userService){

// $scope.getUser = function(){
// 	userService.getUser().then(function(data){
// 		$scope.user = data.data;
// 	})
// }

// console.log('This is the Users info: ' + $scope.user)

// });

(function() {
    angular.module('profile', [])
        .config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
            $routeProvider    
                .when('/profile', {
                    templateUrl: '/views/profile.html',
                    controller: 'profileControl',
                    controllerAs: 'profile'
                }) 
                .when('/connect/local', {
                    templateUrl: '/views/connect-local.html',
                    controller: 'SecondarySignupController',
                    controllerAs: 'profile'
                });

            $locationProvider.html5Mode(true);
        }])
        .controller('profileControl', ['$http', '$scope', '$routeParams', function($http, $scope, $routeParams) {
            //Custom Profile functionality
            $http.get('/api/userData')
                .success(function(data) {
                    $scope.user = data; //Expose the user data to your angular scope
                });
        }])
        .controller('SecondarySignupController', ['$http', '$scope', '$routeParams', function($http, $scope, $routeParams) {
            //Custom Link Page functionality
            $http.get('/api/userData')
                .success(function(data) {
                    $scope.user = data; //Expose the user data to your angular scope
                });
        }]);
})();