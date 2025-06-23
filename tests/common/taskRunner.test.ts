import { executeWithRetries, runCriticalTask } from '../../src/common/taskRunner';

describe('taskRunner', () => {
  describe('executeWithRetries', () => {
    it('should execute successful task on first attempt', async () => {
      let attempts = 0;
      const successfulTask = jest.fn(async () => {
        attempts++;
        return 'success';
      });

      const result = await executeWithRetries(successfulTask, {
        retries: 3,
        delay: 10
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
      expect(successfulTask).toHaveBeenCalledTimes(1);
    });

    it('should retry failed tasks up to the retry limit', async () => {
      let attempts = 0;
      const failingTask = jest.fn(async () => {
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      });

      await expect(
        executeWithRetries(failingTask, {
          retries: 2,
          delay: 10
        })
      ).rejects.toThrow('Attempt 3 failed');

      expect(attempts).toBe(3); // Initial attempt + 2 retries
      expect(failingTask).toHaveBeenCalledTimes(3);
    });

    it('should succeed after retry', async () => {
      let attempts = 0;
      const eventuallySuccessfulTask = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Not yet');
        }
        return 'success after retries';
      });

      const result = await executeWithRetries(eventuallySuccessfulTask, {
        retries: 3,
        delay: 10
      });

      expect(result).toBe('success after retries');
      expect(attempts).toBe(3);
    });

    it('should apply backoff when enabled', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();

      const failingTask = async () => {
        const now = Date.now();
        delays.push(now - lastTime);
        lastTime = now;
        throw new Error('Always fails');
      };

      await expect(
        executeWithRetries(failingTask, {
          retries: 2,
          delay: 10,
          backoff: true
        })
      ).rejects.toThrow();

      // First delay should be ~10ms, second ~20ms (with backoff)
      expect(delays[1]).toBeGreaterThanOrEqual(10);
      expect(delays[2]).toBeGreaterThanOrEqual(20);
    });

    it('should not apply backoff when disabled', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();

      const failingTask = async () => {
        const now = Date.now();
        delays.push(now - lastTime);
        lastTime = now;
        throw new Error('Always fails');
      };

      await expect(
        executeWithRetries(failingTask, {
          retries: 2,
          delay: 10,
          backoff: false
        })
      ).rejects.toThrow();

      // All delays should be ~10ms
      expect(delays[1]).toBeGreaterThanOrEqual(10);
      expect(delays[1]).toBeLessThan(20);
      expect(delays[2]).toBeGreaterThanOrEqual(10);
      expect(delays[2]).toBeLessThan(20);
    });
  });

  describe('runCriticalTask', () => {
    it('should run critical task with default retry settings', async () => {
      const criticalTask = jest.fn(async () => 'critical result');

      const result = await runCriticalTask('Test Critical Task', criticalTask);

      expect(result).toBe('critical result');
      expect(criticalTask).toHaveBeenCalledTimes(1);
    });

    it('should retry critical task on failure', async () => {
      let attempts = 0;
      const eventuallySuccessfulTask = jest.fn(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      const result = await runCriticalTask('Test Critical Task', eventuallySuccessfulTask);

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });

    it('should throw after exhausting retries for critical task', async () => {
      const alwaysFailingTask = jest.fn(async () => {
        throw new Error('Critical failure');
      });

      await expect(
        runCriticalTask('Test Critical Task', alwaysFailingTask)
      ).rejects.toThrow('Critical failure');

      expect(alwaysFailingTask).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });
});
