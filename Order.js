import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  StatusBar,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Button, CartIsEmpty } from '../../../components';
import { getCart, removeItemFromCart } from '../../../services/cartService';
import { getPaymentMethods } from '../../../services/paymentService';
import { createOrder } from '../../../services/orderService';
import { COLORS, FONTS, BASE_URL } from '../../../constants';
import { AlertModal } from '../../../components/ui/GUIComponents'; // Adjust the path as necessary
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import axios from 'axios';

export default function Order() {
  const [cartData, setCartData] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]); // Store available payment methods
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null); // Store selected payment method
  const [loading, setLoading] = useState(true);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const navigation = useNavigation();
  const { id, address } = useSelector((state) => state.user.user || {});
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    type: 'info',
    title: '',
    message: '',
  });
  const GOOGLE_MAPS_API_KEY = 'AIzaSyAhzzTmFbEl_mECND6UoXimUPMvYRxkBQ0'; // Replace with your API key

  useEffect(() => {
    const fetchCartAndPaymentMethods = async () => {
      try {
        const [cartResponse, paymentResponse] = await Promise.all([
          getCart(),
          getPaymentMethods(),
        ]);
        setCartData(cartResponse.data);
        setPaymentMethods(paymentResponse.data.paymentMethods); // Fetch payment methods
      } catch (error) {
        console.error('Error fetching cart or payment methods:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCartAndPaymentMethods();
  }, []);

  useEffect(() => {
    const calculateDeliveryFee = async () => {
      if (!cartData || cartData.cartItems.length === 0 || !address) {
        // If the cart is empty, set delivery fee to null
        setDeliveryFee(null);
        return;
      }

      const userLat = address.latitude;
      const userLon = address.longitude;

      let maxDistance = 0;

      try {
        // Calculate the max distance using Google Maps API
        for (const item of cartData.cartItems) {
          const categoryLat = item.productId?.category?.address?.latitude;
          const categoryLon = item.productId?.category?.address?.longitude;

          if (categoryLat && categoryLon) {
            const distance = await getTravelDistance(
              { latitude: userLat, longitude: userLon },
              { latitude: categoryLat, longitude: categoryLon },
            );

            if (distance > maxDistance) {
              maxDistance = distance;
            }
          }
        }

        // Compute the delivery fee based on the max distance
        const fee = computeDeliveryFee(maxDistance);
        setDeliveryFee(fee);
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        setDeliveryFee(null); // Fallback to null on error
      }
    };

    calculateDeliveryFee();
  }, [cartData, address]);

  const getTravelDistance = async (origin, destination) => {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json`,
        {
          params: {
            origins: `${origin.latitude},${origin.longitude}`,
            destinations: `${destination.latitude},${destination.longitude}`,
            key: GOOGLE_MAPS_API_KEY,
          },
        },
      );

      const distanceInMeters = response.data.rows[0].elements[0].distance.value; // Distance in meters
      const distanceInKilometers = distanceInMeters / 1000; // Convert to kilometers
      return distanceInKilometers;
    } catch (error) {
      console.error('Error fetching travel distance:', error);
      return 0;
    }
  };

  const computeDeliveryFee = (distance) => {
    if (distance <= 2) {
      return 40; // Minimum fee for distances <= 2 km
    }

    const extraDistance = distance - 2; // Distance beyond 2 km
    const extraFee = Math.ceil((extraDistance * 1000) / 100); // Convert to meters and calculate fee
    return 40 + extraFee; // Total fee
  };

  const calculateItemPrice = (item) => {
    const basePrice = item.productId?.price || 0;
    const menuOptionsPrice = item.menuOptions.reduce(
      (sum, option) => sum + option.priceModifier,
      0,
    );
    return (basePrice + menuOptionsPrice) * item.quantity;
  };

  const calculateCartTotal = () => {
    return cartData.cartItems.reduce(
      (sum, item) => sum + calculateItemPrice(item),
      0,
    );
  };

  const renderHeader = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: COLORS.white,
      }}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.black} />
      </TouchableOpacity>
      <Text
        style={{
          ...FONTS.H3,
          color: COLORS.black,
          flex: 1,
          textAlign: 'center',
        }}>
        My Cart
      </Text>
      <View style={{ width: 24 }} />
    </View>
  );

  const renderItem = ({ item }) => {
    const productImage = item.productId?.image
      ? `${BASE_URL}${item.productId.image}`
      : 'https://via.placeholder.com/100';

    const categoryAddress = item.productId?.category?.address;

    const handleRemoveItem = async (cartItemId) => {
      try {
        await removeItemFromCart(cartItemId); // Call the API
        setCartData((prevData) => ({
          ...prevData,
          cartItems: prevData.cartItems.filter(
            (cartItem) => cartItem._id !== cartItemId,
          ),
        }));
        setAlertConfig({
          type: 'success',
          title: 'Item Removed',
          message: 'The item has been successfully removed from your cart.',
        });
        setAlertVisible(true);
      } catch (error) {
        setAlertConfig({
          type: 'error',
          title: 'Error',
          message:
            'Failed to remove the item from your cart. Please try again.',
        });
        setAlertVisible(true);
        console.error('Error removing item from cart:', error);
      }
    };

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: COLORS.white,
          borderRadius: 15,
          marginBottom: 15,
          padding: 10,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}>
        <Image
          source={{ uri: productImage }}
          style={{
            width: 70,
            height: 70,
            borderRadius: 10,
          }}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ ...FONTS.H4, color: COLORS.black }}>
            {item.productId?.name || 'Product Name'}
          </Text>
          <Text style={{ color: COLORS.gray, marginTop: 5 }}>
            ₱{item.productId?.price || 0} x {item.quantity}
          </Text>

          {/* Menu Options */}
          <View style={{ marginTop: 5 }}>
            {item.menuOptions.map((option, index) => (
              <Text
                key={index}
                style={{
                  color: COLORS.gray,
                  marginTop: 3,
                  fontSize: 12,
                }}>
                {option.optionName || 'Option'} (+₱{option.priceModifier || 0})
              </Text>
            ))}
          </View>

          {/* Category Address */}
          {/* {categoryAddress && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>
              Latitude: {categoryAddress.latitude || 'N/A'}
            </Text>
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>
              Longitude: {categoryAddress.longitude || 'N/A'}
            </Text>
          </View>
        )} */}
        </View>
        <TouchableOpacity
          style={{
            padding: 5,
          }}
          onPress={() => handleRemoveItem(item._id)}>
          <Ionicons name="trash-bin" size={20} color={COLORS.red} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderPaymentMethods = () => {
    return (
      <View>
        {paymentMethods.map((method) => {
          if (selectedPaymentMethod && selectedPaymentMethod !== method.id) {
            return null; // Do not render unselected methods
          }

          return (
            <View
              key={method.id}
              style={{
                marginBottom: 15,
                borderRadius: 15,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 5,
                backgroundColor: COLORS.white,
              }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 20,
                  borderLeftWidth: 5,
                  borderLeftColor:
                    selectedPaymentMethod === method.id
                      ? COLORS.primary
                      : 'transparent',
                  backgroundColor:
                    selectedPaymentMethod === method.id
                      ? COLORS.lightPrimary
                      : COLORS.white,
                }}
                onPress={
                  () =>
                    setSelectedPaymentMethod(
                      selectedPaymentMethod === method.id ? null : method.id,
                    ) // Toggle selection
                }>
                {/* Payment Icon */}
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor:
                      selectedPaymentMethod === method.id
                        ? COLORS.primary
                        : COLORS.lightGray,
                    marginRight: 15,
                  }}>
                  <Ionicons
                    name={
                      method.type === 'COD' ? 'cash-outline' : 'qr-code-outline'
                    }
                    size={24}
                    color={
                      selectedPaymentMethod === method.id
                        ? COLORS.white
                        : COLORS.gray
                    }
                  />
                </View>

                {/* Payment Details */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color:
                        selectedPaymentMethod === method.id
                          ? COLORS.primary
                          : COLORS.black,
                    }}>
                    {method.type === 'COD'
                      ? 'Cash on Delivery'
                      : `GCash (${method.gcashDetails?.number})`}
                  </Text>
                  {method.type === 'GCash' && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.gray,
                        marginTop: 5,
                      }}>
                      Scan QR code for faster payment
                    </Text>
                  )}
                </View>

                {/* Radio Button */}
                <Ionicons
                  name={
                    selectedPaymentMethod === method.id
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={24}
                  color={
                    selectedPaymentMethod === method.id
                      ? COLORS.primary
                      : COLORS.gray
                  }
                />
              </TouchableOpacity>

              {/* Show QR Code if GCash is selected */}
              {selectedPaymentMethod === method.id &&
                method.type === 'GCash' &&
                method.gcashDetails?.qrCode && (
                  <View
                    style={{
                      padding: 20,
                      alignItems: 'center',
                      backgroundColor: COLORS.lightGray,
                    }}>
                    <Image
                      source={{ uri: method.gcashDetails.qrCode }}
                      style={{
                        width: 150,
                        height: 150,
                        borderRadius: 10,
                        marginBottom: 10,
                      }}
                    />
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>
                      Use your GCash app to scan this QR code.
                    </Text>
                  </View>
                )}
            </View>
          );
        })}
      </View>
    );
  };

const handleCheckout = async () => {
  if (!cartData || !selectedPaymentMethod || !address) {
    setAlertConfig({
      type: 'error',
      title: 'Missing Information',
      message:
        'Please select a payment method and ensure your cart and address are ready.',
    });
    setAlertVisible(true);
    return;
  }

  const storeCoordinates = {
    latitude:
      cartData.cartItems[0]?.productId?.category?.address?.latitude || 0,
    longitude:
      cartData.cartItems[0]?.productId?.category?.address?.longitude || 0,
  };

  const customerCoordinates = {
    latitude: address.latitude || 0,
    longitude: address.longitude || 0,
  };

  const distance = await getTravelDistance(
    customerCoordinates,
    storeCoordinates,
  );

  const deliveryDetails = {
    status: 'pending', // Initial status
    route: {
      storeCoordinates,
      customerCoordinates,
      distance,
      estimatedTime: Math.ceil((distance / 40) * 60), // Assuming 40 km/h average speed
    },
  };

  const orderData = {
    customer: id,
    store: cartData.cartItems[0]?.productId?.category, // Store ID
    products: cartData.cartItems.map((item) => ({
      product: item.productId._id,
      quantity: item.quantity,
      menuOptions: item.menuOptions.map((option) => option._id),
    })),
    paymentMethodId: selectedPaymentMethod,
    totalAmount: calculateCartTotal() + (deliveryFee || 0),
    deliveryDetails, // Include delivery details
    createdBy: id,
  };

  try {
    const response = await createOrder(orderData); // Send order data to backend
    if (response.status === 201) {
      setAlertConfig({
        type: 'success',
        title: 'Order Created',
        message: 'Your order has been successfully created!',
      });
      setAlertVisible(true);

      // Navigate to OrderSummary and pass order details
      navigation.navigate('OrderSummary', {
        order: response.data.order,
        cartData: cartData,
        deliveryFee: deliveryFee,
        deliveryDetails: deliveryDetails,
      });
    } else {
      setAlertConfig({
        type: 'error',
        title: 'Order Failed',
        message: 'Failed to create your order. Please try again.',
      });
      setAlertVisible(true);
    }
  } catch (error) {
    setAlertConfig({
      type: 'error',
      title: 'Error',
      message: 'An error occurred while processing your order.',
    });
    setAlertVisible(true);
    console.error('Error during checkout:', error);
  }
};


  const renderFooter = () => {
    const cartTotal = calculateCartTotal();
    const grandTotal = cartTotal + deliveryFee;

    return (
      <View style={{ padding: 20, backgroundColor: COLORS.white }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginVertical: 15,
          }}>
          <Text style={{ ...FONTS.body4, color: COLORS.black }}>Total:</Text>
          <Text style={{ ...FONTS.body4, color: COLORS.black }}>
            ₱{cartTotal.toFixed(2)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 15,
          }}>
          <Text style={{ ...FONTS.body4, color: COLORS.gray }}>
            Delivery Fee:
          </Text>
          <Text style={{ ...FONTS.body4, color: COLORS.green }}>
            {deliveryFee === null ? '0.00' : `₱${deliveryFee.toFixed(2)}`}
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}>
          <Text
            style={{
              ...FONTS.body3,
              fontWeight: 'bold',
              color: COLORS.black,
            }}>
            Grand Total:
          </Text>
          <Text
            style={{
              ...FONTS.body3,
              fontWeight: 'bold',
              color: COLORS.primary,
            }}>
            ₱{grandTotal.toFixed(2)}
          </Text>
        </View>

        <Button
          text="Place order"
          containerStyle={{
            backgroundColor: COLORS.primary,
            padding: 15,
            borderRadius: 25,
          }}
          onPress={handleCheckout}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.gray }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        {renderHeader()}
        {cartData && cartData.cartItems.length > 0 ? (
          <FlatList
            data={cartData.cartItems}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 20 }}
            ListFooterComponent={
              <View style={{ marginTop: 20 }}>
                <Text
                  style={{
                    ...FONTS.body4,
                    color: COLORS.black,
                    marginBottom: 10,
                    fontWeight: 'bold',
                  }}>
                  Select Payment Method:
                </Text>
                {renderPaymentMethods()}
              </View>
            }
          />
        ) : (
          <CartIsEmpty />
        )}
        {renderFooter()}
      </View>
      <AlertModal
        visible={alertVisible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}
