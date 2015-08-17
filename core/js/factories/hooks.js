/**************************************************
 *               Hooks Factory                    *
 * Allow modules to hook into core functionality  *
 **************************************************/

angular.module('cosmo').factory('Hooks', function(){

    // Initialize all hooks
    var imageHooks = [];
    var HTMLHooks = [];
    var contentHooks = [];

    return {
        // Content directive. Passes the content as a string
        contentHook: function(hook){
            contentHooks.push(hook);
        },
        contentHookNotify: function(data){
            var newData;
            angular.forEach(contentHooks, function(hook){
                // Feed the output from the last hook into the next
                if(newData)
                    newData = hook(newData);
                else
                    newData = hook(data);
            });
            if(newData) // Return data after handing it off to any hooks
                return newData;
            else
                return data;
        },
        // Image directive. Passes the URL of the image as a string
        imageHook: function(hook){
            imageHooks.push(hook);
        },
        imageHookNotify: function(data){
            var newData;
            angular.forEach(imageHooks, function(hook){
                // Feed the output from the last hook into the next
                if(newData)
                    newData = hook(newData);
                else
                    newData = hook(data);
            });
            if(newData) // Return data after handing it off to any hooks
                return newData;
            else
                return data;
        },
        // HTML Ctrl. Passes an object with 'title', and 'description' parameters
        HTMLHook: function(hook){
            HTMLHooks.push(hook); // Register Hook
        },
        HTMLHookNotify: function(data){
            var newData;
            angular.forEach(HTMLHooks, function(hook){
                // Feed the output from the last hook into the next
                if(newData)
                    newData = hook(newData);
                else
                    newData = hook(data);
            });
            if(newData) // Return data after handing it off to any hooks
                return newData;
            else
                return data;
        }
    };
});
