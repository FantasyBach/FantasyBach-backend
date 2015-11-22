# Required setup before can run "jaws dash"

After you have installed jaws, you still need to:

1. Create admin.env
https://github.com/jaws-framework/JAWS/blob/master/docs/project_structure.md
```
echo "ADMIN_AWS_PROFILE=fantasybach" > admin.env
```

2. Create .env
```
echo "JAWS_STAGE=dev\nJAWS_DATA_MODEL_STAGE=dev" > .env
```

3. Run
```
npm install
```

# CORS support
CORS is needed because browser is going to making AJAX calls to a URL like https://kku30n0xzl.execute-api.us-east-1.amazonaws.com/ (which is on a different domain).

These API gateway docs describe enabling CORS: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html

With CORS, we need to add OPTIONS, and to make sure that other verbs include "Access-Control-Allow-Origin".

JAWS currently doesn't have a way to have multiple Methods on a given Resource.  See:
* https://github.com/jaws-framework/JAWS/issues/251
* Need an OPTIONS method per https://github.com/jaws-framework/JAWS/issues/222

That said, this is being worked on in https://github.com/jaws-framework/JAWS/issues/278

For now, I have just enabled CORS via the UI by following https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html.  This creates the appropriate OPTIONS method.
You have to add the accepts-header "x-amz-security-token".  You can't wildcard it per http://stackoverflow.com/questions/13146892/cors-access-control-allow-headers-wildcard-being-ignored
You have to add this header, because the API Gateway generated JS SDK adds this token when doing authorization.

Make sure you deploy the API after using the UI to add CORS.  I lost at least an hour here :(

In awsm.json, I addeded
```
APIGateway.Responses.responseParameters : {
   "method.response.header.Access-Control-Allow-Origin": "'*'"
}
```
so that the GET method would work keep working when overridden by JAWS.

# Other notes
## What to set for the AuthorizationType in awsm.json?
http://docs.aws.amazon.com/apigateway/api-reference/link-relation/method-put/ doesn't list valid values.
There are no docs for the API Gateway pseudo-cloudformation stuff.
In the console, the string "AWS_IAM" is listed, and that works!
