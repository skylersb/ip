var app = angular.module('polls');

app.controller('loginControl', function($scope, $http, $location, userService, $cookieStore){
	$scope.loginInfo = true;
    $scope.signupInfo = true;

    $scope.showLocalLogin = function(){
        $scope.loginInfo = !$scope.loginInfo;
    }

    $scope.showLocalSignup = function(){
        $scope.signupInfo = !$scope.signupInfo;
    }

    $scope.fbLogin = function(){
      $location.path('/auth/facebook');
    }

  $scope.twitterLogin = function(){
      $location.path('/auth/twitter');
    }

  $scope.login = function() {
    $http
    .post('/login', {
        email: this.email,
        password: this.password
    })
    .success(function(data) {
        console.log(data);
    });
}
    $scope.connect = function() {
        $http
        .post('/connect/local', {
            email: this.email,
            password: this.password
        })
        .success(function(data) {
            console.log(data);
        });
    }

    $scope.signup = function() {
        console.log("Boom");
        $http
        .post('/signup', {
            email: this.email,
            password: this.password
        })
        .success(function(data) {
            console.log(data);
        });
    }

});

