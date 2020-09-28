const INCREASE = "INCREASE";
const DECREASE = "DECREASE";
const SET = "SET";
const FIRST = "FIRST";
const LAST = "LAST";

const genAsyncIterator = (instance, genValue) => {
  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        next: async () => {
          const done = i > instance.length - 1;

          return {
            done,
            value: await genValue(i++),
          };
        },
      };
    },
  };
};

const setLength = (instance, method, value) => {
  switch (method) {
    case SET:
      if (typeof value === "number") {
        // TODO: handle resize data removal on resize
        // Should probably be done with a setter
        instance.length = value;
      }
      break;
    case INCREASE:
      instance.length += 1;
      break;
    case DECREASE:
      instance.length -= 1;
      break;
  }
};

const iterate = async (instance, callback) => {
  let broke = false;

  const breakOut = () => (broke = true);

  for (let i = 0; i < instance.length; i++) {
    await callback(i, breakOut);

    if (broke) {
      break;
    }
  }
};

const iteright = async (instance, callback, fromIndex = -1) => {
  let broke = false;

  const breakOut = () => (broke = true);

  const length = instance.length;
  const iStart =
    fromIndex < 0
      ? length + fromIndex
      : fromIndex > length - 1
      ? length - 1
      : fromIndex;

  for (let i = iStart; i >= 0; i--) {
    callback(i, breakOut);

    if (broke) {
      break;
    }
  }
};

const retrieve = (instance, nth) => {
  switch (nth) {
    case FIRST:
      return instance[0];
    case LAST:
      return instance[instance.length - 1];
    default:
      return instance[nth];
  }
};

const eachArgs = (instance, args, callback) => {
  for (let i = 0; i < args.length; i++) {
    callback.call(instance, args[i], i, args);
  }
};

const eachRight = (array, callback, thisArg) => {
  for (let i = array.length - 1; i >= 0; i--) {
    callback.call(thisArg, array[i], i, array);
  }
};

function AsyncArray(...args) {
  const { length, 0: first } = args;
  this.length = 0;
  if (typeof first === "number" && length === 1) {
    this.length = length;
  } else {
    this.length = args.length;
    for (let i = 0; i < args.length; i++) {
      this[i] = args[i];
    }
  }
}

AsyncArray.prototype.forEach = async function (callback, thisArg) {
  await iterate(this, async (i) => {
    await callback.call(thisArg || this, this[i], i, this);
  });
};

AsyncArray.prototype.map = async function (callback, thisArg) {
  const next = new AsyncArray();
  await iterate(this, async (i) => {
    const v = await callback.call(thisArg || this, this[i], i, this);
    next.push(v);
  });
  return next;
};

AsyncArray.prototype.reduce = async function (callback, initialValue) {
  let accumulator = initialValue;
  await iterate(this, async (i) => {
    accumulator = await callback(accumulator, this[i], i, this);
  });

  return accumulator;
};

AsyncArray.prototype.push = async function (...pushValues) {
  eachArgs(this, pushValues, function (value) {
    this[this.length] = value;
    setLength(this, INCREASE);
  });

  return this.length;
};

AsyncArray.prototype.pop = async function () {
  const last = retrieve(this, LAST);
  delete this[this.length - 1];
  setLength(this, DECREASE);
  return last;
};

AsyncArray.prototype.shift = async function () {
  const first = retrieve(this, FIRST);
  await this.forEach(function (value, index) {
    if (index === 0) {
      return;
    }
    this[index - 1] = value;
  }, this);
  this.pop();
  return first;
};

AsyncArray.prototype.unshift = async function (...values) {
  const upBy = values.length;
  eachRight(
    this,
    function (value, i) {
      this[i + upBy] = value;

      if (i < upBy) {
        this[i] = values[i];
        setLength(this, INCREASE);
      }
    },
    this
  );
  return this.length;
};

AsyncArray.prototype.filter = async function (predicate, thisArg) {
  const newArr = new AsyncArray();

  await this.forEach(async function (value, index, array) {
    const res = !!(await predicate.call(thisArg, this[i], i, this));
    if (Boolean(res)) {
      await newArr.push(value);
    }
  });

  return newArr;
};

AsyncArray.prototype.every = async function (predicate, thisArg) {
  let every = true;

  for (let i = 0; i < this.length; i++) {
    every = !!(await predicate.call(thisArge, this[i], i, this));
    if (every === false) {
      break;
    }
  }
  e;
  return every;
};

AsyncArray.prototype.some = async function (predicate, thisArg) {
  let some = false;

  for (let i = 0; i < this.length; i++) {
    some = !!(await predicate.call(thisArg, this[i], i, this));
    if (some === true) {
      break;
    }
  }

  return some;
};

AsyncArray.prototype.findIndex = async function (predicate, thisArg) {
  let index = -1;

  for (let i = 0; i < this.length; i++) {
    const found = !!(await predicate.call(thisArg, this[i], i, this));
    if (found === true) {
      index = i;
      break;
    }
  }

  return index;
};

AsyncArray.prototype.indexOf = async function (value) {
  return this.findIndex((v) => v === value);
};

AsyncArray.prototype.lastIndexOf = async function (value, fromIndex) {
  let lastIndex = -1;
  await iteright(
    this,
    (i, breakout) => {
      if (this[i] === value) {
        lastIndex = i;
        breakout();
      }
    },
    fromIndex
  );
  return lastIndex;
};

AsyncArray.prototype.find = async function (predicate, thisArg) {
  const index = await this.findIndex(predicate, thisArg);
  return this[index];
};

AsyncArray.prototype.includes = async function (value, fromIndex = 0) {
  let found = false;
  for (let i = fromIndex; i < this.length; i++) {
    if (this[i] === value) {
      found = true;
      break;
    }
  }
  return found;
};

AsyncArray.prototype.join = async function (seperator = ",") {
  let str = "";

  await iterate(this, (i, breakout) => {
    str += `${i === 0 ? "" : seperator}${this[i]}`;
  });

  return str;
};

AsyncArray.prototype.reverse = async function () {
  await iterate(this, (i, breakout) => {
    const l = this.length - 1;
    if (i > l / 2) {
      breakout();
      return;
    }
    const pairIndex = l - i;
    const leftVal = this[i];
    this[i] = this[pairIndex];
    this[pairIndex] = leftVal;
  });

  return this;
};

AsyncArray.prototype.toString = async function () {
  return await this.join();
};

AsyncArray.prototype.keys = async function () {
  return genAsyncIterator(this, (i) => i);
};

AsyncArray.prototype.values = async function () {
  return genAsyncIterator(this, (i) => this[i]);
};
