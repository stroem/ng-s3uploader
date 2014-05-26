# ng-s3uploader

Angular module for uploading images to Amazon S3

## Installation

	npm install ng-s3uploader

Make sure you include the javascript file in your index.html

## Example

### Setup server (tornado web server)

	class S3AccessToken(tornado.web.RequestHandler):

		def get(self):
			expiration_date = datetime.datetime.now() + datetime.timedelta(minutes=60)
			data = {
				'policy': self.__s3_upload_policy(expiration_date),
				'signature': self.__s3_upload_signature(expiration_date),
				'key': self.settings.get('aws_key')
			}

			self.write(json.dumps(data))

		def __s3_upload_policy(self, expiration_date):

			format_date = expiration_date.strftime("%Y-%m-%dT%H:%M:%SZ")
			content_length = 10 * 1024 * 1024

			string_to_sign = {
				"expiration": str(format_date),
				"conditions": [
					{"bucket": self.settings.get("aws_bucket")},
					["starts-with","$key",""],
					{ "acl" : "public-read" },
					[ "starts-with", "$Content-Type", "" ],
					[ "content-length-range", 0 , content_length ]
				]
			}

			policy_json = json.dumps(string_to_sign)
			return base64.b64encode(policy_json)

		def __s3_upload_signature(self, expiration_date):
			key = self.settings.get("aws_secret")
			string_to_sign= self.__s3_upload_policy(expiration_date)
			hash = hmac.new(key, string_to_sign, hashlib.sha1)
			hash_digest = hash.digest()

			return base64.b64encode(hash_digest)

	handlers = [
		(r'/s3/access_token', S3AccessToken)
	]

### Setup client (angularjs)
...
