'use strict';
function googleSignIn(googleUser) {
    var id_token = googleUser.getAuthResponse().id_token;
    AWS.config.update({
        region: 'us-east-1',
        credentials: new AWS.CognitoIdentityCredentials({
            IdentityPoolId: learnjs.poolId,
            Logins: {
                'accounts.google.com': id_token
            }
        })
    });

    learnjs.awsRefresh().then(function(id) {
        learnjs.identity.resolve({
            id: id,
            email: googleUser.getBasicProfile().getEmail(),
            refresh: refresh
        });
    });
}

function refresh() {
    return gapi.auth2.getAuthInstance().signIn({
        prompt: 'login'
    }).then(function(userUpdate) {
        var creds = AWS.config.credentials;
        var newToken = userUpdate.getAuthResponse().id_token;
        creds.params.Logins['accounts.google.com'] = newToken;
        return learnjs.awsRefresh();
    });
}

var learnjs = {
    poolId: 'us-east-1:9e5f6c6d-1c1d-484e-bd60-faad346a57af'
};

learnjs.awsRefresh = function() {
    var deferred = new $.Deferred();
    AWS.config.credentials.refresh(function(err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(AWS.config.credentials.identityId);
        }
    });
    return deferred.promise();
};

learnjs.profileView = function () {
    var view = learnjs.template('profile-view');
    learnjs.identity.done(function(identity) {
        view.find('.email').text(identity.email);
    });
    return view;
};

learnjs.identity = new $.Deferred();

learnjs.problemView = function(data) {
    var problemNumber = parseInt(data, 10);
    var view = $('.templates .problem-view').clone();
    var problemData = learnjs.problems[problemNumber - 1];
    var resultFlash = view.find('.result');

    function checkAnswer() {
	var answer = view.find('.answer').val();
	var test = problemData.code.replace('__', answer) + '; problem();';
	return eval(test);
    }

    function checkAnswerClick() {
	if (checkAnswer()) {
	    var correctFlash = learnjs.buildCorrectFlash(problemNumber);
	    learnjs.flashElement(resultFlash, correctFlash);
	} else {
	    learnjs.flashElement(resultFlash, 'Incorrect!');
	}
	return false;
    }

    view.find('.check-btn').click(checkAnswerClick);
    view.find('.title').text('Problem #' + problemNumber);

    if (problemNumber < learnjs.problems.length) {
        var buttonItem = learnjs.template('skip-btn');
        buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1 ));
        $('.nav-list').append(buttonItem);
        view.bind('removingView', function() {
            buttonItem.remove();
        });
    }

    learnjs.applyObject(problemData, view);
    return view;
};

learnjs.template = function(name) {
    return $('.templates .' + name).clone();
};

learnjs.showView = function(hash) {
    var routes = {
	    '#problem': learnjs.problemView,
        '#profile': learnjs.profileView,
        '#': learnjs.landingView,
        '': learnjs.landingView
    };
    var hashParts = hash.split('-');
    var viewFn = routes[hashParts[0]];
    if (viewFn) {
        learnjs.triggerEvent('removingView', []);
	    $('.view-container').empty().append(viewFn(hashParts[1]));
    }
};

learnjs.buildCorrectFlash = function(problemNum) {
    var correctFlash = learnjs.template('correct-flash');
    var link = correctFlash.find('a');
    if (problemNum < learnjs.problems.length) {
        link.attr('href', '#problem-' + (problemNum + 1));
    } else {
        link.attr('href', '');
        link.text("You're Finished");
    }
    return correctFlash;
};

learnjs.flashElement = function(elem, content) {
    elem.fadeOut('fast', function() {
        elem.html(content);
        elem.fadeIn();
    })
};

learnjs.appOnReady = function() {
    window.onhashchange = function() {
	    learnjs.showView(window.location.hash);
    };
    learnjs.showView(window.location.hash);
    learnjs.identity.done(learnjs.addProfileLink);
};

learnjs.addProfileLink = function(profile) {
    var link = learnjs.template('profile-link');
    link.find('a').text(profile.email);
    $('.signin-bar').prepend(link);
};

learnjs.applyObject = function(obj, elem) {
    for (var key in obj) {
	elem.find('[data-name="' + key + '"]').text(obj[key]);
    }
};

learnjs.landingView = function() {
    return learnjs.template('landing-view');
};

learnjs.triggerEvent = function(name, args) {
    $('.view-container>*').trigger(name, args);
};

learnjs.problems = [
    {
        description: "What is truth?",
        code: "function problem() { return __; }"
    },
    {
        description: "Simple Math",
        code: "function problem() { return 42 === 6 * __; }"
    },
    {
        description: "Another simple test",
        code: "function problem() { return 1952 === 61 * __; }"
    },
    {
        description: "Left shift test",
        code: "function problem() { return 1952 === 61 << __; }"
    },
    {
        description: "Right shift test",
        code: "function problem() { return 61 === 1953 >> __; }"
    }
];
