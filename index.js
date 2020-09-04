const INCREASE = "INCREASE";
const DECREASE = "DECREASE";
const SET = "SET";
const FIRST = "FIRST";
const LAST = "LAST";

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
  for (let i = 0; i < this.length; i++) {
    await callback.call(thisArg || this, this[i], i, this);
  }
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

AsyncArray.prototype.filter = async function (predicate) {
  const newArr = new AsyncArray();

  await this.forEach(async function (value, index, array) {
    const res = await predicate(value, index, array);
    if (Boolean(res)) {
      await newArr.push(value);
    }
  });

  return newArr;
};

AsyncArray.prototype.every = async function (predicate) {
  let every = true;

  for (let i = 0; i < this.length; i++) {
    every = await predicate(this[i], i, this);
    if (every === false) {
      break;
    }
  }

  return every;
};

AsyncArray.prototype.some = async function (predicate) {
  let some = false;

  for (let i = 0; i < this.length; i++) {
    some = await predicate(this[i], i, this);
    if (some === true) {
      break;
    }
  }

  return some;
};
