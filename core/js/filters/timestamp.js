/**************************************************
 *       Unix Timestamp to Date Filter            *
 **************************************************/

angular.module('cosmo').filter('timestamp', function() {
    return function(input) {
        var date = new Date(input * 1000);
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();

        return month + '/' + day + '/' + year;
    };
});
