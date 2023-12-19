<script lang="ts">
	import { onMount } from 'svelte';
	import { Card } from 'flowbite-svelte';
	import { Heading } from 'flowbite-svelte';

	export let frameId: string = '';
	export let cameraName: string = '';
	export let currentPedestriansCount: bigint = BigInt(0);

	export let imagePath: string = '/images/camera-img-placeholder.jpg';

	onMount(async () => {
		let retryCount = 0;
		const maxRetries = 5;
		const retryDelay = 500;

		while (retryCount < maxRetries) {
			try {
				const res = await fetch(`http://smartface-demo:8098/api/v1/Frames/${frameId}`);

				if (!res.ok) {
					throw new Error(`Error fetching Frame data. Status: ${res.status}`);
				}

				const jsonFrame = await res.json();

				if (!jsonFrame || !jsonFrame.imageDataId) {
					throw new Error('Invalid Frame data received');
				}

				const imageResponse = await fetch(
					`http://smartface-demo:8098/api/v1/Images/${jsonFrame.imageDataId}`
				);

				if (!imageResponse.ok) {
					throw new Error(`Error fetching Image data. Status: ${imageResponse.status}`);
				}

				imagePath = `http://smartface-demo:8098/api/v1/Images/${jsonFrame.imageDataId}`;

				// Data fetching succeeded, break out of the loop
				break;
			} catch (error) {
				//console.error('fetch Error:', error.message);
				console.error('fettch Error');

				// Increment retry count
				retryCount++;

				// Check if there are more retries, and if so, wait before the next attempt
				if (retryCount < maxRetries) {
					console.log(`Retrying in ${retryDelay / 1000} seconds...`);
					await new Promise((resolve) => setTimeout(resolve, retryDelay));
				} else {
					console.error('Max retries reached. Fetch failed.');
				}
			}

			console.log('fetching done');
		}
	});
</script>

<Card img={imagePath} class="bg-cyan-600">
    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {cameraName}
    </h5>
    <Heading tag="h1" class="mb-4" customSize="text-4xl font-extrabold  md:text-5xl lg:text-6xl">
        {currentPedestriansCount}
    </Heading>
</Card>
