/**
 * AWS S3 Configuration for backups and logs
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

class S3Service {
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.dataBucket = process.env.S3_BUCKET || 'hashnhedge-pool-data';
        this.backupBucket = process.env.S3_BACKUP_BUCKET || 'hashnhedge-pool-backups';
        this.logBucket = process.env.S3_LOG_BUCKET || 'hashnhedge-pool-logs';

        this.client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
        });

        console.log(`✅ S3 Service initialized (region: ${this.region})`);
    }

    /**
     * Upload file to S3
     */
    async uploadFile(bucket, key, data, contentType = 'application/octet-stream') {
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: data,
            ContentType: contentType,
            ServerSideEncryption: 'AES256'
        });

        try {
            const response = await this.client.send(command);
            console.log(`✅ Uploaded to S3: s3://${bucket}/${key}`);
            return response;
        } catch (error) {
            console.error(`❌ S3 upload error:`, error);
            throw error;
        }
    }

    /**
     * Download file from S3
     */
    async downloadFile(bucket, key) {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key
        });

        try {
            const response = await this.client.send(command);
            const stream = response.Body;
            const chunks = [];

            for await (const chunk of stream) {
                chunks.push(chunk);
            }

            const data = Buffer.concat(chunks);
            console.log(`✅ Downloaded from S3: s3://${bucket}/${key}`);
            return data;
        } catch (error) {
            console.error(`❌ S3 download error:`, error);
            throw error;
        }
    }

    /**
     * List files in bucket
     */
    async listFiles(bucket, prefix = '') {
        const command = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix
        });

        try {
            const response = await this.client.send(command);
            return response.Contents || [];
        } catch (error) {
            console.error(`❌ S3 list error:`, error);
            throw error;
        }
    }

    /**
     * Upload database backup
     */
    async uploadDatabaseBackup(backupData) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const key = `database/backups/${timestamp}.sql.gz`;

        // Compress backup
        const compressed = zlib.gzipSync(backupData);

        return await this.uploadFile(
            this.backupBucket,
            key,
            compressed,
            'application/gzip'
        );
    }

    /**
     * Upload log file
     */
    async uploadLog(logData, logType = 'general') {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const date = new Date().toISOString().split('T')[0];
        const key = `logs/${logType}/${date}/${timestamp}.log`;

        return await this.uploadFile(
            this.logBucket,
            key,
            logData,
            'text/plain'
        );
    }

    /**
     * Upload pool stats snapshot
     */
    async uploadPoolStats(statsData) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const date = new Date().toISOString().split('T')[0];
        const key = `stats/${date}/${timestamp}.json`;

        const jsonData = JSON.stringify(statsData, null, 2);

        return await this.uploadFile(
            this.dataBucket,
            key,
            jsonData,
            'application/json'
        );
    }

    /**
     * Upload worker performance data
     */
    async uploadWorkerData(workerId, workerData) {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const date = new Date().toISOString().split('T')[0];
        const key = `workers/${workerId}/${date}/${timestamp}.json`;

        const jsonData = JSON.stringify(workerData, null, 2);

        return await this.uploadFile(
            this.dataBucket,
            key,
            jsonData,
            'application/json'
        );
    }

    /**
     * Get recent backups
     */
    async getRecentBackups(limit = 10) {
        const files = await this.listFiles(this.backupBucket, 'database/backups/');
        return files
            .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
            .slice(0, limit);
    }

    /**
     * Restore database from backup
     */
    async restoreDatabase(backupKey) {
        const compressed = await this.downloadFile(this.backupBucket, backupKey);
        const decompressed = zlib.gunzipSync(compressed);
        return decompressed.toString('utf8');
    }
}

module.exports = S3Service;
