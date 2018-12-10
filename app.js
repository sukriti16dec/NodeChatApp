const express = require('express')
const app = express()

var Swagger = require('swagger-client');
var open = require('open');
var rp = require('request-promise');

// config items
var pollInterval = 100;
var directLineSecret = "zpOORYNwvxU.cwA.-UM.bZkGczgu0Lg0jngv8qBcJf4HTfnukRSrszKD_RkiW-k";//'ZszfeFKhjn8.cwA.dhE.Ajf-Wz3BerYhPid4VxCgDaJQl2yoCnsAw6B0bs1Xpe8'; - INNA BOT
var directLineClientName = 'Default Site';
var directLineSpecUrl = 'https://docs.botframework.com/en-us/restapi/directline3/swagger.json';

var clientObj;
var conversationIDObj;

var directLineClient = rp(directLineSpecUrl)
    .then(function (spec) {
        // client
        return new Swagger({
            spec: JSON.parse(spec.trim()),
            usePromise: true
        });
    })
    .then(function (client) {
        // add authorization header to client
        client.clientAuthorizations.add('AuthorizationBotConnector', new Swagger.ApiKeyAuthorization('Authorization', 'Bearer ' + directLineSecret, 'header'));
        return client;
    })
    .catch(function (err) {
        console.error('Error initializing DirectLine client', err);
    });

// once the client is ready, create a new conversation
directLineClient.then(function (client) {
    client.Conversations.Conversations_StartConversation()                          // create conversation
        .then(function (response) {
            return response.obj.conversationId;
        })                            // obtain id
        .then(function (conversationId) {
            clientObj = client;
            conversationIDObj = conversationId;
            //console.log('Starting polling message for conversationId: ' + conversationId);

            sendMessagesFromConsole(client, conversationId);                        // start watching console input for sending new messages to bot
            pollMessages(client, conversationId);                                   // start polling messages from bot
        })
        .catch(function (err) {
            console.error('Error starting conversation', err);
        });
});

// Read from console (stdin) and send input to conversation using DirectLine client
function sendMessagesFromConsole(client, conversationId) {
    var stdin = process.openStdin();
    process.stdout.write('Command> ');
    stdin.addListener('data', function (e) {
        var input = e.toString().trim();
        if (input) {
            // exit
            if (input.toLowerCase() === 'exit') {
                return process.exit();
            }

            // send message
            client.Conversations.Conversations_PostActivity(
                {
                    conversationId: conversationId,
                    activity: {
                        textFormat: 'plain',
                        text: input,
                        type: 'message',
                        from: {
                            id: directLineClientName,
                            name: directLineClientName
                        }
                    }
                }).catch(function (err) {
                    console.error('Error sending message:', err);
                });

            process.stdout.write('Command> ');
        }
    });
}

function sendMessage(client, conversationId, input)
{
    // send message
    client.Conversations.Conversations_PostActivity(
    {
        conversationId: conversationId,
        activity: {
            textFormat: 'plain',
            text: input,
            type: 'message',
            from: {
                id: directLineClientName,
                name: directLineClientName
            }
        }
    }).catch(function (err) {
        console.error('Error sending message:', err);
    });
}

// Poll Messages from conversation using DirectLine client
function pollMessages(client, conversationId) {
    console.log('Starting polling message for conversationId: ' + conversationId);
    var watermark = null;
    setInterval(function () {
        client.Conversations.Conversations_GetActivities({ conversationId: conversationId, watermark: watermark })
            .then(function (response) {
                watermark = response.obj.watermark;                                 // use watermark so subsequent requests skip old messages
                return response.obj.activities;
            })
            .then(printMessages);
    }, pollInterval);
}

// Helpers methods
function printMessages(activities) {
    if (activities && activities.length) {
        // ignore own messages
        activities = activities.filter(function (m) { return m.from.id !== directLineClientName });

        if (activities.length) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);

            // print other messages
            activities.forEach(printMessage);

            process.stdout.write('Command> ');
        }
    }
}

var responseObj = null;
function printMessage(activity) {
    if (activity.text) {
        console.log(activity.text);
        responseObj.send({"response" : activity.text});
    }

    if (activity.attachments) {
        activity.attachments.forEach(function (attachment) {
            switch (attachment.contentType) {
                case "application/vnd.microsoft.card.hero":
                    renderHeroCard(attachment);
                    break;

                case "image/png":
                    console.log('Opening the requested image ' + attachment.contentUrl);
                    open(attachment.contentUrl);
                    break;
            }
        });
    }
}

function renderHeroCard(attachment) {
    var width = 70;
    var contentLine = function (content) {
        return ' '.repeat((width - content.length) / 2) +
            content +
            ' '.repeat((width - content.length) / 2);
    }

    console.log('/' + '*'.repeat(width + 1));
    console.log('*' + contentLine(attachment.content.title) + '*');
    console.log('*' + ' '.repeat(width) + '*');
    console.log('*' + contentLine(attachment.content.text) + '*');
    console.log('*'.repeat(width + 1) + '/');
}

app.use(express.json());

app.get('/', (req, res) => {
    sendMessage(clientObj, conversationIDObj, 'Hello'); 
    res.send('Hello World!')
});

app.post('/postMessage', (req,res) => {
    sendMessage(clientObj, conversationIDObj, req.body.message);
    
    responseObj = res;
    // var watermark = null;
    // clientObj.Conversations.Conversations_GetActivities({ conversationId: conversationIDObj, watermark: watermark })
    //         .then(function (response) {
    //             watermark = response.obj.watermark;                                 // use watermark so subsequent requests skip old messages
    //             return response.obj.activities;
    //         })
    //         .then(printMessages);
    // res.send('DONE');
});

function respond(activities){
    if (activities && activities.length) {
        // ignore own messages
        activities = activities.filter(function (m) { return m.from.id !== directLineClientName });

        if (activities.length) {
            // print other messages
            //activities.forEach((activity) => {
                if(activities[activities.length - 1].text != undefined && activities[activities.length - 1].text != null){
                    console.log(activities[activities.length - 1].text);
                    return (activities[activities.length - 1].text);
                }
            //});
        }
    }
}
//app.listen(3979, () => console.log('App listening on port 3979!'))
app.listen(3000, () => console.log('App listening on port 3000!'))