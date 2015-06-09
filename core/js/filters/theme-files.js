/**************************************************
 *           Admin Panel Directive                *
 *        Format theme html files into            *
 *        user-friendly page options              *
 **************************************************/

angular.module('cosmo').filter('themeFiles', function(){
    return function(input){
        if(input){
            // Don't include folders in the name
            var parts = input.split('/');
            var output = parts[parts.length-1];
            // Remove .html extension
            output = output.replace(/\.html/g,' ');
            // Replace hyphens with spaces
            output = output.replace(/\-/g,' ');
            // Capitalize the first letter of every word
            output = output.replace(/\b./g, function(m){ return m.toUpperCase(); });

            return output.trim();
        } else
            return input;
    };
});
