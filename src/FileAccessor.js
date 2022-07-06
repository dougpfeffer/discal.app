const AWS = require('aws-sdk');

// This tool's files all live on S3, but we'll tuck that logic inside a generic "FileAccesser"
// class so we can swap out for filesystem or something else if needed.
class FileAccessor {
  constructor(bucketName){
    this.bucketName = bucketName
    const credentials = new AWS.Credentials(process.env.AWS_ACCESS_KEY, process.env.AWS_ACCESS_SECRET);
    this.s3 = new AWS.S3({ region: 'us-east-1', credentials: credentials, apiVersion: '2006-03-01' });
  }

  async saveFile(path, content){
    const params = {
      Bucket:  this.bucketName,
      Key: path,
      Body: content
    };
    return await this.s3.upload(params).promise();
  }

  async readFile(path) {
    const params = {Bucket: this.bucketName, Key: path}
    const response = await this.s3.getObject(params).promise()
    return response.Body.toString('utf-8');

  }

}

module.exports = FileAccessor