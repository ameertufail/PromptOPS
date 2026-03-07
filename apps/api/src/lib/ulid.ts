const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;
const RANDOM_BYTES = 10;

function encodeBase32(value: bigint, length: number) {
  let encoded = "";
  let remainder = value;

  for (let index = 0; index < length; index += 1) {
    encoded = ULID_ALPHABET[Number(remainder % 32n)] + encoded;
    remainder /= 32n;
  }

  return encoded;
}

function randomBytes(byteLength: number) {
  return crypto.getRandomValues(new Uint8Array(byteLength));
}

function bytesToBigInt(bytes: Uint8Array) {
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return value;
}

export function createUlid(timestamp = Date.now()) {
  if (!Number.isInteger(timestamp) || timestamp < 0) {
    throw new TypeError("ULID timestamps must be positive integers.");
  }

  const encodedTime = encodeBase32(BigInt(timestamp), TIME_LENGTH);
  const encodedRandom = encodeBase32(
    bytesToBigInt(randomBytes(RANDOM_BYTES)),
    RANDOM_LENGTH
  );

  return `${encodedTime}${encodedRandom}`;
}
