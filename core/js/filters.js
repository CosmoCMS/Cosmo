// Unix timestamp to date filter
app.filter('timestamp', function() {
    return function(input) {
        var date = new Date(input * 1000);
        var day = date.getDate();
        var month = date.getMonth() + 1;
        var year = date.getFullYear();

        return month + '/' + day + '/' + year;
    };
});


// Pagination filter - http://stackoverflow.com/questions/11581209/angularjs-pagination-on-a-list-using-ng-repeater
app.filter('startFrom', function() {
    return function(input, start) {
        start = +start; //parse to int
        return input.slice(start);
    };
});

// Format large dollar amounts as 100K or 10MM
app.filter('money', function(){
    return function(input, lowercase){
        var number = input;
        var letter = '';
        
        if(input >= 1000000000000){
            number = input / 1000000000000;
            letter = 'T';
        }else if(input >= 1000000000){
            number = input / 1000000000;
            letter = 'B';
        }else if(input >= 1000000){
            number = input / 1000000;
            letter = 'M';
        }else if(input >= 1000){
            number = input / 1000;
            letter = 'K';
        }
        
        if(lowercase)
            letter = letter.toLowerCase();

        return (Math.round(number * 100) / 100) + letter;
    };
});

// Format feet as acres
app.filter('acre', function(){
    return function(input){
        var output = input;
        var abbr = ' sq ft';

        if(input >= 43560){
            output = input / 43560;
            abbr = ' ac';
        }

        return (Math.round(output * 100) / 100) + abbr;
    };
});

// Format bytes
app.filter('bytes', function(){
    return function(input){
        var output = input + ' bytes';
        
        if(input >= 1024*1024*1024*1024*1024)
            output = input / (1024*1024*1024*1024*1024) + 'PB';
        else if(input >= 1024*1024*1024*1024)
            output = input / (1024*1024*1024*1024) + 'TB';
        else if(input >= 1024*1024*1024)
            output = input / (1024*1024*1024) + 'GB';
        else if(input >= 1024*1024)
            output = input / (1024*1024) + 'MB';
        else if(input >= 1024)
            output = input / 1024 + 'KB';
        
        return output;
    };
});

// If square feet is at max, show + sign
app.filter('max', function(){
    return function(input){
        if(input > 4999)
            return input + '+';
        else
            return input;
    };
});

// Cut off text and add ellipses (...) after a certain character count
app.filter('ellipses', function(){
    return function(input, chars){
        if(input.length > chars)
            return input.substring(0, parseInt(chars)) + '...';
        else
            return input;
    };
});